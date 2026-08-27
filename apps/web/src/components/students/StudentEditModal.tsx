import { Edit3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'

interface StudentEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: { id: string; displayName: string; username: string } | null
  classId: string
  onStudentUpdated: () => void
}

export function StudentEditModal({
  open,
  onOpenChange,
  student,
  classId,
  onStudentUpdated,
}: StudentEditModalProps) {
  const [displayName, setDisplayName] = useState(student?.displayName || '')
  const [username, setUsername] = useState(student?.username || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (student) {
      setDisplayName(student.displayName)
      setUsername(student.username)
      setPassword('')
    }
  }, [student])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student || !displayName.trim() || !username.trim()) return

    setLoading(true)
    try {
      await apiFetch(`/api/classes/${classId}/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim().toLowerCase(),
          ...(password.trim() ? { password: password.trim() } : {}),
        }),
      })
      onStudentUpdated()
      onOpenChange(false)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estudiante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Estudiante"
      description="Actualiza el nombre completo, usuario o contraseña del alumno."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nombre y Apellidos
            </label>
            <Input
              placeholder="Ej: Sofía García"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nombre de Usuario (Login)
            </label>
            <Input
              placeholder="Ej: sofia.garcia"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nueva Contraseña (Opcional)
            </label>
            <Input
              type="text"
              placeholder="Dejar en blanco para conservar la actual"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !displayName.trim() || !username.trim()}
            className="gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
