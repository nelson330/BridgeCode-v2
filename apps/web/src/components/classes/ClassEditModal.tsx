import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { notify } from '../../lib/feedback'
import { Edit3 } from '../../lib/icons'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { FormError } from '../ui/FormError'
import { Input } from '../ui/Input'

interface ClassEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cls: { id: string; name: string; code: string } | null
  onClassUpdated: () => void
}

export function ClassEditModal({ open, onOpenChange, cls, onClassUpdated }: ClassEditModalProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState(cls?.name || '')
  const [loading, setLoading] = useState(false)

  // Sync state on change
  if (cls && name === '' && cls.name !== '') {
    setName(cls.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!cls || !name.trim()) return

    setLoading(true)
    try {
      await apiFetch(`/api/classes/${cls.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      })
      onClassUpdated()
      onOpenChange(false)
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar la clase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Clase"
      description="Modifica el nombre o información de esta clase."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormError message={formError} />
        <div className="space-y-4">
          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5"
              htmlFor="classeditmodal-field-1"
            >
              Nombre de la Clase
            </label>
            <Input
              id="classeditmodal-field-1"
              placeholder="Ej: Biología 6to B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-1">
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">
              Código de Invitación:
            </span>
            <span className="font-mono font-bold text-lg text-accent">{cls?.code}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !name.trim()} className="gap-2">
            <Edit3 className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
