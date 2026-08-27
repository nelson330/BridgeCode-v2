import { AlertCircle, Bot, CheckCircle2, Key, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { sound } from '../../lib/audio-synth'
import { triggerConfetti } from '../../lib/confetti'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { CustomSelect } from '../ui/Select'

const DEFAULT_PRESETS = [
  {
    id: 'groq',
    name: 'Groq (Llama / Mixtral)',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    hasKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT / GPT-4o)',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    hasKey: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    hasKey: false,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-1.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    hasKey: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Hub)',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    hasKey: false,
  },
  {
    id: 'zen',
    name: 'OpenCode Zen (GLM)',
    defaultModel: 'glm-4-flash',
    baseUrl: 'https://api.z.ai/v1',
    hasKey: false,
  },
  {
    id: 'nim',
    name: 'NVIDIA NIM',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    hasKey: false,
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    defaultModel: 'default',
    baseUrl: '',
    hasKey: false,
  },
]

export function AiSettingsTab() {
  const [providers, setProviders] = useState<any[]>(DEFAULT_PRESETS)
  const [selectedProvider, setSelectedProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('llama-3.3-70b-versatile')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async (preserveSelected = false) => {
    try {
      const res = await apiFetch<{ providers: any[] }>('/api/ai/providers')
      if (res.providers && res.providers.length > 0) {
        setProviders(res.providers)
        // Auto-select configured provider or keep selected
        const configured = res.providers.find((p) => p.isConfigured || p.hasKey)
        const target = preserveSelected
          ? res.providers.find((p) => p.id === selectedProvider) || configured || res.providers[0]
          : configured || res.providers[0]

        if (target) {
          setSelectedProvider(target.id)
          setModel(target.selectedModel || target.defaultModel)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId)
    setApiKey('')
    const prov = providers.find((p) => p.id === providerId)
    if (prov) {
      setModel(prov.selectedModel || prov.defaultModel)
      setAvailableModels([])
      setStatusMessage(null)
    }
  }

  const handleTestAndFetchModels = async () => {
    setIsTesting(true)
    setStatusMessage(null)

    try {
      const res = await apiFetch<{ ok: boolean; models: string[]; defaultModel: string }>(
        '/api/ai/config/test',
        {
          method: 'POST',
          body: JSON.stringify({
            provider: selectedProvider,
            apiKey: apiKey || undefined,
            model: model || undefined,
          }),
        }
      )
      setAvailableModels(res.models)
      if (res.defaultModel) {
        setModel(res.defaultModel)
      }
      sound.playCorrect()
      setStatusMessage({
        type: 'success',
        text: `¡Conexión exitosa! Se obtuvieron ${res.models.length} modelos dinámicamente del proveedor.`,
      })
    } catch (err: any) {
      sound.playIncorrect()
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al conectar con el proveedor de IA',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    setStatusMessage(null)

    try {
      await apiFetch('/api/ai/config', {
        method: 'PUT',
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey || undefined,
          model,
          enabled: true,
        }),
      })

      sound.playVictory()
      triggerConfetti()
      setApiKey('')
      setStatusMessage({
        type: 'success',
        text: '¡Configuración de IA y clave cifrada con AES-256-GCM guardada con éxito!',
      })
      await loadProviders(true)
    } catch (err: any) {
      sound.playIncorrect()
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al guardar configuración',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const activeProv = providers.find((p) => p.id === selectedProvider)
  const isProvConfigured = Boolean(activeProv?.isConfigured || activeProv?.hasKey)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          <h2 className="font-display font-black text-2xl text-white">
            Configuración del Motor de IA Multi-Proveedor
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Configura tus llaves de API (cifradas en base de datos con AES-256-GCM) para habilitar la generación
          pedagógica de 8 tipos de ejercicios desde cualquier apunte o texto.
        </p>
      </div>

      {/* Provider Cards Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Selecciona el Proveedor de IA
          </span>
          <div className="w-full sm:w-72">
            <CustomSelect
              value={selectedProvider}
              onChange={(val) => handleProviderSelect(val)}
              options={providers.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {providers.map((p) => {
            const isSelected = selectedProvider === p.id
            const isConfig = Boolean(p.isConfigured || p.hasKey)
            return (
              <Card
                key={p.id}
                hoverEffect
                onClick={() => handleProviderSelect(p.id)}
                className={`p-4 cursor-pointer text-left space-y-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{p.name.split(' ')[0]}</span>
                  {isConfig && (
                    <Badge variant="success" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Activo</span>
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{p.defaultModel}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Provider Details & API Key Form */}
      <Card className="space-y-5 p-6 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Ajustes de {activeProv?.name || selectedProvider}
              </h3>
              {isProvConfigured && (
                <Badge variant="success" className="text-[10px] px-2 py-0.5">
                  ✓ Clave Guardada
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-400">
              Servidor base: {activeProv?.baseUrl || 'https://api.groq.com/openai/v1'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Cifrado AES-256-GCM</span>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Clave de API (API Key)
          </label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={
                isProvConfigured
                  ? '•••••••••••••••••••••••• (Clave guardada y cifrada con AES-256)'
                  : 'sk-... o gsk_...'
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs font-mono"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleTestAndFetchModels}
              isLoading={isTesting}
              className="shrink-0 gap-1.5 text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Probar & Cargar Modelos</span>
            </Button>
          </div>
          {isProvConfigured && !apiKey && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Tu clave de API ya está guardada y cifrada con AES-256-GCM en la base de datos. Solo ingresa
                texto aquí si deseas actualizarla por una nueva.
              </span>
            </div>
          )}
        </div>

        {/* Model Selector / Display */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Modelo por Defecto (
            {availableModels.length > 0 ? `${availableModels.length} disponibles` : 'Predeterminado'})
          </label>
          {availableModels.length > 0 ? (
            <CustomSelect
              value={model}
              onChange={(val) => setModel(val)}
              options={availableModels.map((m) => ({
                value: m,
                label: m,
              }))}
            />
          ) : (
            <Input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="llama-3.3-70b-versatile"
              className="text-xs font-mono"
            />
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </motion.div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveConfig}
            isLoading={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
