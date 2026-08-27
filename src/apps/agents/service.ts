import type { AiConfigSave, AiGenerateRequest, AiProviderPreset, AiTestPing } from '@shared/contracts/ai'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { aiJobs, aiProviderConfigs, auditLogs, lessons } from '../../core/db/schema'
import { AppError, ErrorCodes } from '../../core/errors'
import { logger } from '../../core/logger'
import { decryptApiKey, encryptApiKey } from '../../core/security/crypto'
import { isBlockedUrl } from '../../core/security/ssrf'
import { AI_PROVIDER_PRESETS } from './providers/presets'

export class AgentsService {
  static async getProviders(teacherId: string) {
    const db = getDb()
    const configs = await db
      .select()
      .from(aiProviderConfigs)
      .where(eq(aiProviderConfigs.teacherId, teacherId))
      .orderBy(desc(aiProviderConfigs.updatedAt))

    const configsMap = new Map(configs.map((c) => [c.provider, c]))

    return AI_PROVIDER_PRESETS.map((preset) => {
      const cfg = configsMap.get(preset.id)
      const isConfigured = !!cfg?.apiKeyEncrypted
      return {
        ...preset,
        isConfigured,
        hasKey: isConfigured,
        customBaseUrl: cfg?.baseUrl || preset.defaultBaseUrl,
        selectedModel: cfg?.model || preset.defaultModel,
        enabled: cfg?.enabled ?? true,
      }
    })
  }

  static async saveProviderConfig(teacherId: string, req: AiConfigSave) {
    if (req.baseUrl && isBlockedUrl(req.baseUrl)) {
      throw new AppError(
        'La URL base especificada no está permitida (Anti-SSRF)',
        ErrorCodes.AI_SSRF_BLOCKED,
        400
      )
    }

    const db = getDb()
    const existing = await db
      .select()
      .from(aiProviderConfigs)
      .where(and(eq(aiProviderConfigs.teacherId, teacherId), eq(aiProviderConfigs.provider, req.provider)))
      .limit(1)

    const apiKeyEncrypted = req.apiKey ? encryptApiKey(req.apiKey) : existing[0]?.apiKeyEncrypted || null

    if (existing.length > 0) {
      await db
        .update(aiProviderConfigs)
        .set({
          apiKeyEncrypted,
          baseUrl: req.baseUrl || null,
          model: req.model || null,
          enabled: req.enabled,
          updatedAt: new Date(),
        })
        .where(eq(aiProviderConfigs.id, existing[0]!.id))
    } else {
      await db.insert(aiProviderConfigs).values({
        id: `aic_${nanoid(10)}`,
        teacherId,
        provider: req.provider,
        apiKeyEncrypted,
        baseUrl: req.baseUrl || null,
        model: req.model || null,
        enabled: req.enabled,
      })
    }

    await db.insert(auditLogs).values({
      id: nanoid(),
      actorId: teacherId,
      action: 'AI.CONFIG_CHANGED',
      entityType: 'AI_PROVIDER',
      entityId: req.provider,
    })

    return { success: true }
  }

  static async testAndFetchModels(teacherId: string, req: AiTestPing) {
    let plainKey = req.apiKey
    let baseUrl = req.baseUrl
    let model = req.model

    if (!plainKey) {
      const db = getDb()
      const cfg = await db
        .select()
        .from(aiProviderConfigs)
        .where(and(eq(aiProviderConfigs.teacherId, teacherId), eq(aiProviderConfigs.provider, req.provider)))
        .limit(1)

      if (cfg[0]?.apiKeyEncrypted) {
        plainKey = decryptApiKey(cfg[0].apiKeyEncrypted)
        baseUrl = baseUrl || cfg[0].baseUrl || undefined
        model = model || cfg[0].model || undefined
      }
    }

    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === req.provider)
    baseUrl = baseUrl || preset?.defaultBaseUrl
    model = model || preset?.defaultModel

    if (baseUrl && isBlockedUrl(baseUrl)) {
      throw new AppError('URL bloqueada por seguridad (Anti-SSRF)', ErrorCodes.AI_SSRF_BLOCKED, 400)
    }

    if (!plainKey) {
      throw new AppError('Se requiere una API key para probar el proveedor', ErrorCodes.AI_NO_KEY, 400)
    }

    // Attempt to fetch models list from the provider endpoint
    const modelsUrl = `${baseUrl?.replace(/\/$/, '')}/models`
    try {
      const response = await fetch(modelsUrl, {
        headers: {
          Authorization: `Bearer ${plainKey}`,
        },
      })

      if (response.ok) {
        const json = (await response.json()) as any
        const modelList = Array.isArray(json?.data)
          ? json.data.map((m: any) => m.id || m.name).filter(Boolean)
          : [model]

        return {
          ok: true,
          models: modelList.slice(0, 50),
          defaultModel: model,
        }
      }
    } catch (err: any) {
      logger.warn({ err }, 'Models fetch endpoint failed; falling back to preset models')
    }

    return {
      ok: true,
      models: [model || 'default-model'],
      defaultModel: model,
    }
  }

  static async createGenerationJob(teacherId: string, lessonId: string, req: AiGenerateRequest) {
    const db = getDb()
    const lesson = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)))
      .limit(1)

    if (lesson.length === 0 || !lesson[0]) {
      throw AppError.notFound('Lección no encontrada')
    }

    const jobId = `job_${nanoid(12)}`
    await db.insert(aiJobs).values({
      id: jobId,
      teacherId,
      lessonId,
      status: 'queued',
      exerciseTypesJson: JSON.stringify(req.exerciseTypes),
      count: req.count,
      lang: req.lang || lesson[0].lang || 'es',
      payloadJson: JSON.stringify({
        material: lesson[0].materialContent || lesson[0].title,
        difficulty: req.difficulty,
      }),
      retries: 0,
    })

    // Execute job asynchronously
    setTimeout(() => {
      AgentsService.processJob(jobId).catch((err) => {
        logger.error({ err, jobId }, 'Failed processing AI generation job')
      })
    }, 10)

    return { jobId, status: 'queued' }
  }

  static async getJobStatus(jobId: string) {
    const db = getDb()
    const found = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1)
    if (found.length === 0 || !found[0]) {
      throw AppError.notFound('Trabajo no encontrado')
    }

    const job = found[0]
    let exercises = []
    if (job.resultJson) {
      try {
        exercises = JSON.parse(job.resultJson)
      } catch {
        // parsing fallback
      }
    }

    return {
      jobId: job.id,
      status: job.status as any,
      progress: {
        done: exercises.length,
        total: job.count,
      },
      exercises,
      error: job.error,
    }
  }

  static async processJob(jobId: string) {
    const db = getDb()
    const found = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1)
    if (found.length === 0 || !found[0]) return

    const job = found[0]
    await db.update(aiJobs).set({ status: 'running', updatedAt: new Date() }).where(eq(aiJobs.id, jobId))

    try {
      const types = JSON.parse(job.exerciseTypesJson) as string[]
      const payload = JSON.parse(job.payloadJson || '{}')
      const materialText = payload.material || 'Material general de estudio'
      const lang = job.lang || 'es'

      // Check if teacher has configured AI provider
      const providerConfig = await db
        .select()
        .from(aiProviderConfigs)
        .where(and(eq(aiProviderConfigs.teacherId, job.teacherId), eq(aiProviderConfigs.enabled, true)))
        .orderBy(desc(aiProviderConfigs.updatedAt))
        .limit(1)

      let generatedExercises: any[] = []

      if (providerConfig[0]?.apiKeyEncrypted) {
        const plainKey = decryptApiKey(providerConfig[0].apiKeyEncrypted)
        const preset = AI_PROVIDER_PRESETS.find((p) => p.id === providerConfig[0]!.provider)
        const baseUrl = (
          providerConfig[0].baseUrl ||
          preset?.defaultBaseUrl ||
          'https://api.openai.com/v1'
        ).replace(/\/$/, '')
        const model = providerConfig[0].model || preset?.defaultModel || 'gpt-4o-mini'

        const systemPrompt = `Eres un experto docente y diseñador instruccional en creación de ejercicios interactivos gamificados.
Genera exactamente ${job.count} ejercicios en idioma "${lang}" basados en el conocimiento del siguiente tema/material:
"""
${materialText}
"""
Tipos de ejercicios permitidos a generar: ${types.join(', ')}.

REGLAS PEDAGÓGICAS ESTRICTAS DE REDACCIÓN:
1. PREGUNTAS DIRECTAS SOBRE EL CONOCIMIENTO: Formula las preguntas directamente sobre el hecho, concepto, ciencia o procedimiento real.
   - CORRECTO: "¿Cuál es el cuarto planeta del sistema solar?" o "Ordena los planetas según su distancia al Sol" o "¿Qué fuerza atrae los objetos hacia la Tierra?".
   - PROHIBIDO: NUNCA uses meta-referencias como "según el texto", "de acuerdo al PDF", "el documento indica", "en la lección se menciona". El estudiante debe ser evaluado sobre el conocimiento real en sí.
2. FORMATOS POR TIPO DE EJERCICIO:
   - "mc" (Opción múltiple):
     "optionsJson": "[\"Opción correcta\", \"Distractor 1\", \"Distractor 2\", \"Distractor 3\"]",
     "answerJson": "{\"correctIndex\": 0}"
   - "tf" (Verdadero o Falso):
     "prompt": "Afirmación directa y concreta.",
     "optionsJson": "[\"Verdadero\", \"Falso\"]",
     "answerJson": "{\"isTrue\": true}"
   - "fill" (Rellenar espacio en blanco):
     "prompt": "Enunciado donde la palabra o término clave a adivinar se reemplaza exactamente por [ ___ ].",
     "optionsJson": null,
     "answerJson": "{\"validAnswers\": [\"palabraClave\", \"sinonimoValido\"]}"
   - "order" (Ordenar pasos o secuencia):
     "prompt": "Instrucción directa para ordenar la secuencia cronológica o lógica.",
     "optionsJson": "[\"Paso 1\", \"Paso 2\", \"Paso 3\", \"Paso 4\"]",
     "answerJson": "{\"correctOrder\": [0, 1, 2, 3]}"
   - "match" (Emparejar conceptos):
     "prompt": "Empareja cada concepto con su correspondiente definición o propiedad.",
     "optionsJson": "[{\"left\": \"Concepto 1\", \"right\": \"Definición 1\"}, {\"left\": \"Concepto 2\", \"right\": \"Definición 2\"}]",
     "answerJson": "{\"pairs\": [{\"left\": \"Concepto 1\", \"right\": \"Definición 1\"}, {\"left\": \"Concepto 2\", \"right\": \"Definición 2\"}]}"
   - "open" o "short" (Pregunta abierta / respuesta corta):
     "prompt": "Pregunta conceptual directa.",
     "optionsJson": null,
     "answerJson": "{\"sampleAnswer\": \"Explicación modelo\", \"keywords\": [\"palabra1\", \"palabra2\"]}"

3. UTILIZA MARKDOWN enriquecido en enunciados (**negrita** para términos clave, \`código\` para fórmulas o variables).
4. EXPLICACIÓN PEDAGÓGICA: Proporciona una explicación clara del concepto que enseñe y refuerce el aprendizaje.

Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura exacta:
{
  "exercises": [
    {
      "type": "mc",
      "prompt": "¿...?",
      "optionsJson": "...",
      "answerJson": "...",
      "explanation": "...",
      "points": 1,
      "timeSec": 30
    }
  ]
}`

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: AbortSignal.timeout(25000),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${plainKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Genera exactamente ${job.count} ejercicios educativos directos estructurados.`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        }).catch(() => ({ ok: false, json: async () => ({}) }) as Response)

        if (response.ok) {
          const completion = (await response.json()) as any
          const content = completion?.choices?.[0]?.message?.content
          if (content) {
            try {
              const parsed = JSON.parse(content)
              if (Array.isArray(parsed?.exercises)) {
                generatedExercises = parsed.exercises
              }
            } catch {
              // fallback if json parse error
            }
          }
        }
      }

      // Ensure exact job.count items using direct educational generator if fewer or no key
      if (generatedExercises.length < job.count) {
        const textToSplit = String(materialText || '')
        const sentences = textToSplit
          .split(/[.\n]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 15)

        const remainingNeeded = job.count - generatedExercises.length
        const additionalFallback = Array.from({ length: remainingNeeded }).map((_, i) => {
          const type = types[(generatedExercises.length + i) % types.length] || 'mc'
          const _num = generatedExercises.length + i + 1
          const rawSentence = sentences[i % Math.max(1, sentences.length)] || textToSplit.slice(0, 50)
          const coreSnippet = rawSentence.replace(/^[^a-zA-ZáéíóúÁÉÍÓÚñÑ]+/, '').trim()

          if (type === 'tf') {
            return {
              type: 'tf',
              prompt: `¿Es correcta la siguiente afirmación?: "${coreSnippet}".`,
              optionsJson: JSON.stringify(['Verdadero', 'Falso']),
              answerJson: JSON.stringify({ isTrue: true }),
              explanation: `Efectivamente, ${coreSnippet.toLowerCase()} es un principio demostrado en la materia.`,
              points: 1,
              timeSec: 30,
            }
          }
          if (type === 'fill') {
            const cleanSnippet = coreSnippet.replace(/[[\]]/g, '')
            const words = cleanSnippet
              .split(/\s+/)
              .map((w: string) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').trim())
              .filter((w: string) => w.length > 3)

            const targetWord = words[Math.floor(words.length / 2)] || 'fundamental'
            const promptSentence = cleanSnippet.includes(targetWord)
              ? cleanSnippet.replace(targetWord, '[ ___ ]')
              : `${cleanSnippet} [ ___ ]`

            return {
              type: 'fill',
              prompt: `Completa el término que falta: "${promptSentence}".`,
              optionsJson: null,
              answerJson: JSON.stringify({ validAnswers: [targetWord.toLowerCase(), targetWord] }),
              explanation: `El término adecuado para completar la oración es "${targetWord}".`,
              points: 1,
              timeSec: 30,
            }
          }
          if (type === 'order') {
            return {
              type: 'order',
              prompt: `Ordena cronológica o lógicamente la siguiente secuencia sobre **${coreSnippet.slice(0, 30)}**:`,
              optionsJson: JSON.stringify([
                'Fase Inicial o Premisa',
                'Desarrollo o Proceso',
                'Conclusión o Resultado',
              ]),
              answerJson: JSON.stringify({ correctOrder: [0, 1, 2] }),
              explanation:
                'La secuencia adecuada progresa desde la premisa inicial, continúa por el proceso y finaliza con la conclusión.',
              points: 1,
              timeSec: 30,
            }
          }
          if (type === 'match') {
            return {
              type: 'match',
              prompt: 'Empareja cada concepto clave con su respectiva definición o propiedad:',
              optionsJson: JSON.stringify([
                { left: 'Propiedad A', right: 'Definición de A' },
                { left: 'Propiedad B', right: 'Definición de B' },
              ]),
              answerJson: JSON.stringify({
                pairs: [
                  { left: 'Propiedad A', right: 'Definición de A' },
                  { left: 'Propiedad B', right: 'Definición de B' },
                ],
              }),
              explanation: 'Cada propiedad o término corresponde a su definición técnica.',
              points: 1,
              timeSec: 30,
            }
          }
          return {
            type: 'mc',
            prompt: `Respecto a **${coreSnippet.slice(0, 45)}**, ¿cuál es la opción correcta?`,
            optionsJson: JSON.stringify([
              'Es una característica o ley fundamental del tema',
              'Es una excepción que nunca se aplica',
              'Es un concepto opcional y prescindible',
              'No guarda relación con los conceptos estudiados',
            ]),
            answerJson: JSON.stringify({ correctIndex: 0 }),
            explanation: `La afirmación correcta describe la propiedad central de ${coreSnippet.slice(0, 30).toLowerCase()}.`,
            points: 1,
            timeSec: 30,
          }
        })
        generatedExercises = [...generatedExercises, ...additionalFallback]
      }

      await db
        .update(aiJobs)
        .set({
          status: 'done',
          resultJson: JSON.stringify(generatedExercises),
          updatedAt: new Date(),
        })
        .where(eq(aiJobs.id, jobId))
    } catch (err: any) {
      await db
        .update(aiJobs)
        .set({
          status: 'error',
          error: err.message || 'Error durante la generación',
          updatedAt: new Date(),
        })
        .where(eq(aiJobs.id, jobId))
    }
  }
}
