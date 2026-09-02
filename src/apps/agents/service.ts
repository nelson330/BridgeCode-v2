import type { AiConfigSave, AiGenerateRequest, AiProviderPreset, AiTestPing } from '@shared/contracts/ai'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../../core/db/client'
import { aiJobs, aiProviderConfigs, auditLogs, lessons } from '../../core/db/schema'
import { AppError, ErrorCodes } from '../../core/errors'
import { logger } from '../../core/logger'
import { decryptApiKey, encryptApiKey } from '../../core/security/crypto'
import { isBlockedUrl } from '../../core/security/ssrf'
import { extractPdfText } from './pdf-extract'
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

    // Extract PDF text if the lesson has a material file. We only abort the job
    // when the lesson relies solely on a PDF that we can't read and the teacher
    // did not type any inline material — in that case there is no real content
    // to base exercises on, so we refuse to fabricate questions.
    let pdfText = ''
    let pdfError: string | null = null
    if (lesson[0].materialFile) {
      try {
        const result = await extractPdfText(lesson[0].materialFile)
        pdfText = result.text
        if (result.source === 'empty' || !pdfText) {
          pdfError =
            'No se pudo extraer texto del PDF. Verifica que el documento contenga texto seleccionable (no sea una imagen escaneada).'
        }
      } catch (err: any) {
        pdfError = `No se pudo leer el PDF: ${err?.message || 'archivo corrupto o protegido'}`
      }
    }

    const textMaterial = (lesson[0].materialContent || '').trim()
    const combined = [textMaterial, pdfText].filter(Boolean).join('\n\n')

    // Empty lesson + unreadable PDF → abort with a clear explanation, never
    // generate placeholder exercises.
    if (!combined.trim() && pdfError) {
      await db.insert(aiJobs).values({
        id: jobId,
        teacherId,
        lessonId,
        status: 'error',
        error: pdfError,
        exerciseTypesJson: JSON.stringify(req.exerciseTypes),
        count: req.count,
        lang: req.lang || lesson[0].lang || 'es',
        payloadJson: JSON.stringify({ difficulty: req.difficulty, hasPdf: true }),
        retries: 0,
      })
      throw AppError.badRequest(pdfError)
    }

    // Also abort if the lesson has neither text nor PDF at all.
    if (!combined.trim()) {
      const msg =
        'La lección no tiene contenido (ni texto ni PDF). Agrega material antes de generar ejercicios.'
      await db.insert(aiJobs).values({
        id: jobId,
        teacherId,
        lessonId,
        status: 'error',
        error: msg,
        exerciseTypesJson: JSON.stringify(req.exerciseTypes),
        count: req.count,
        lang: req.lang || lesson[0].lang || 'es',
        payloadJson: JSON.stringify({ difficulty: req.difficulty }),
        retries: 0,
      })
      throw AppError.badRequest(msg)
    }

    await db.insert(aiJobs).values({
      id: jobId,
      teacherId,
      lessonId,
      status: 'queued',
      exerciseTypesJson: JSON.stringify(req.exerciseTypes),
      count: req.count,
      lang: req.lang || lesson[0].lang || 'es',
      payloadJson: JSON.stringify({
        material: combined,
        difficulty: req.difficulty,
        pdfSource: pdfText ? 'extracted' : 'none',
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

        const systemPrompt = `Eres un experto docente y diseñador instruccional en creación de ejercicios interactivos gamificados de alto nivel.
${materialText ? `A partir del siguiente material educativo:\n"""\n${materialText}\n"""\n\n` : ''}Genera exactamente ${job.count} ejercicios en idioma "${lang}"${
          materialText
            ? ' basados estrictamente en el contenido del material mostrado arriba.'
            : ' sobre el tema indicado en el título de la lección.'
        }
Tipos de ejercicios permitidos a generar: ${types.join(', ')}.

CRITERIOS ESTRICTOS DE COHERENCIA PEDAGÓGICA Y ASIGNACIÓN DE TIPOS:
1. SELECCIÓN CONTEXTUAL DEL TIPO DE EJERCICIO:
   - "order" (Ordenar Secuencia): ÚSALO ÚNICAMENTE cuando los datos del material presenten una secuencia cronológica, histórica, lógica, algorítmica, procesal o de fases (ej. pasos del método científico, etapas de la mitosis, eventos históricos en orden temporal, orden de planetas por distancia al Sol). PROHIBIDO usar "order" para listas de conceptos no ordenados o definiciones inconexas.
   - "match" (Emparejar Columnas): ÚSALO ÚNICAMENTE cuando existan relaciones biunívocas claras de correspondencia (ej. Concepto ↔ Definición, Término ↔ Propiedad, Órgano ↔ Función, Causa ↔ Efecto, País ↔ Capital). Cada par debe tener una correspondencia unívoca sin ambigüedad.
   - "slider" (Estimación Numérica): ÚSALO ÚNICAMENTE para preguntas cuya respuesta sea una cantidad medible, fecha/año, porcentaje, temperatura o magnitud física con un rango (min, max) coherente y tolerancia razonable.
   - "fill" (Rellenar Hueco con Banco de Palabras): La palabra clave a adivinar se reemplaza exactamente por [ ___ ]. Es OBLIGATORIO incluir en "optionsJson" la palabra correcta más 3 distractores altamente plausibles del EXACTO MISMO campo semántico y categoría gramatical (ej. si la respuesta es "Mitocondria", distractores: ["Ribosoma", "Lisosoma", "Aparato de Golgi"]).
   - "mc" (Opción Múltiple): Formular preguntas directas con 4 opciones plausibles del mismo contexto.
   - "tf" (Verdadero o Falso): Afirmación conceptual rotunda y precisa sobre hechos comprobables.

2. CERO PREGUNTAS DE TEXTO LIBRE: Todos los ejercicios deben ser 100% interactivos mediante opciones seleccionables, emparejamiento, ordenamiento o sliders numéricos. No formules preguntas que requieran escribir párrafos o texto libre.

3. PREGUNTAS DIRECTAS SOBRE EL CONOCIMIENTO: Formula las preguntas directamente sobre el hecho o concepto real.
   - CORRECTO: "¿Cuál es la capital de Francia?" o "Ordena las fases del ciclo celular:"
   - PROHIBIDO: NUNCA uses meta-referencias como "según el texto", "de acuerdo al PDF", "el documento indica".

4. ESTRUCTURA Y FORMATOS EXACTOS:
   - "mc":
     "optionsJson": "[\"Opción correcta\", \"Distractor 1\", \"Distractor 2\", \"Distractor 3\"]",
     "answerJson": "{\"correctIndex\": 0}"
   - "tf":
     "optionsJson": "[\"Verdadero\", \"Falso\"]",
     "answerJson": "{\"isTrue\": true}"
   - "fill":
     "prompt": "Enunciado donde el término clave se reemplaza exactamente por [ ___ ].",
     "optionsJson": "[\"PalabraCorrecta\", \"Distractor 1\", \"Distractor 2\", \"Distractor 3\"]",
     "answerJson": "{\"validAnswers\": [\"PalabraCorrecta\"]}"
   - "order":
     "prompt": "Ordena los siguientes pasos de la secuencia:",
     "optionsJson": "[\"Paso 1\", \"Paso 2\", \"Paso 3\", \"Paso 4\"]",
     "answerJson": "{\"correctOrder\": [0, 1, 2, 3]}"
   - "match":
     "prompt": "Empareja cada concepto con su definición:",
     "optionsJson": "[{\"left\": \"Concepto 1\", \"right\": \"Definición 1\"}, {\"left\": \"Concepto 2\", \"right\": \"Definición 2\"}, {\"left\": \"Concepto 3\", \"right\": \"Definición 3\"}]",
     "answerJson": "{\"pairs\": [{\"left\": \"Concepto 1\", \"right\": \"Definición 1\"}, {\"left\": \"Concepto 2\", \"right\": \"Definición 2\"}, {\"left\": \"Concepto 3\", \"right\": \"Definición 3\"}]}"
   - "slider":
     "prompt": "¿En qué año se produjo...?",
     "optionsJson": null,
     "answerJson": "{\"min\": 1900, \"max\": 2000, \"correctValue\": 1969, \"tolerance\": 2}"

5. EXPLICACIÓN PEDAGÓGICA: Proporciona una explicación clara en "explanation" con formato Markdown enriquecido (**negrita**, \`código\`).

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
      "timeSec": 30,
      "pointsMultiplier": 1
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

      // If the model produced fewer exercises than requested, mark the job as
      // error and DO NOT fabricate placeholders. The user gets a clear message
      // and can retry or reduce the count.
      if (generatedExercises.length < job.count) {
        await db
          .update(aiJobs)
          .set({
            status: 'error',
            error: `El modelo generó ${generatedExercises.length} de ${job.count} ejercicios solicitados. No se generaron placeholders. Intenta de nuevo o reduce la cantidad.`,
            resultJson: generatedExercises.length > 0 ? JSON.stringify(generatedExercises) : null,
            updatedAt: new Date(),
          })
          .where(eq(aiJobs.id, jobId))
        return
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

  static async generateSummaryFromMaterial(
    teacherId: string,
    params: {
      lessonId?: string
      fileUrl?: string
      content?: string
      lang?: string
    }
  ): Promise<{ summary: string; title?: string }> {
    const db = getDb()
    let rawText = (params.content || '').trim()
    let pdfUrl = params.fileUrl

    if (params.lessonId) {
      const foundLesson = await db
        .select()
        .from(lessons)
        .where(and(eq(lessons.id, params.lessonId), eq(lessons.teacherId, teacherId)))
        .limit(1)
      if (foundLesson[0]) {
        if (!rawText && foundLesson[0].materialContent) {
          rawText = foundLesson[0].materialContent.trim()
        }
        if (!pdfUrl && foundLesson[0].materialFile) {
          pdfUrl = foundLesson[0].materialFile
        }
      }
    }

    let pdfText = ''
    if (pdfUrl) {
      try {
        const extracted = await extractPdfText(pdfUrl)
        if (extracted.text) {
          pdfText = extracted.text
        }
      } catch (err: any) {
        logger.warn({ err }, 'Error extracting PDF text for summary')
        if (!rawText) {
          throw AppError.badRequest(
            `No se pudo leer el archivo PDF: ${err?.message || 'archivo corrupto o sin texto'}`
          )
        }
      }
    }

    const combined = [rawText, pdfText].filter(Boolean).join('\n\n')
    if (!combined.trim()) {
      throw AppError.badRequest('No se encontró contenido de texto ni en el PDF para generar el resumen.')
    }

    // Get configured AI provider
    const providerConfig = await db
      .select()
      .from(aiProviderConfigs)
      .where(and(eq(aiProviderConfigs.teacherId, teacherId), eq(aiProviderConfigs.enabled, true)))
      .orderBy(desc(aiProviderConfigs.updatedAt))
      .limit(1)

    if (!providerConfig[0]?.apiKeyEncrypted) {
      throw AppError.badRequest(
        'No hay ningún proveedor de IA configurado con API Key. Configura uno en la pestaña de Ajustes de IA.'
      )
    }

    const plainKey = decryptApiKey(providerConfig[0].apiKeyEncrypted)
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === providerConfig[0]!.provider)
    const baseUrl = (
      providerConfig[0].baseUrl ||
      preset?.defaultBaseUrl ||
      'https://api.openai.com/v1'
    ).replace(/\/$/, '')
    const model = providerConfig[0].model || preset?.defaultModel || 'gpt-4o-mini'
    const lang = params.lang || 'es'

    const systemPrompt = `Eres un experto docente y pedagogo universitario.
Tu tarea es leer el material educativo proporcionado (documento/PDF/apuntes de clase) y redactar un resumen educativo estructurado y claro en formato Markdown en idioma "${lang}".

REGLAS DE FORMATO MARKDOWN ESTRICTAS:
1. Usa encabezados (# Título de la Lección, ## Secciones Principales, ### Subtemas).
2. Comienza con una introducción concisa sobre el tema.
3. Resalta conceptos y palabras clave en **negrita**.
4. Usa listas con viñetas (-) para puntos clave, pasos o características.
5. Si hay términos técnicos, código o fórmulas, usa \`código en línea\`.
6. Termina con una sección de "## Puntos Clave para Recordar".
7. NO uses meta-referencias como "En este documento...", "El texto habla de...". Escribe directamente los apuntes y conceptos de estudio como material formativo para los estudiantes.`

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(35000),
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
            content: `Genera un resumen educativo completo en Markdown a partir del siguiente material de la clase:\n\n"""\n${combined.slice(0, 40000)}\n"""`,
          },
        ],
      }),
    }).catch((err) => {
      throw AppError.badRequest(`Error al conectar con el proveedor de IA: ${err.message || 'Timeout'}`)
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw AppError.badRequest(
        `Error de la API de IA (${response.status}): ${errText || 'Respuesta no válida'}`
      )
    }

    const completion = (await response.json()) as any
    const content = completion?.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw AppError.badRequest('El modelo de IA no devolvió contenido para el resumen.')
    }

    return { summary: content }
  }
}
