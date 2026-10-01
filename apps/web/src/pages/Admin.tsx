import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { AsyncState } from '../components/ui/AsyncState'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { CustomSelect } from '../components/ui/Select'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'
import { confirmAction, notify, notifySuccess } from '../lib/feedback'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Database,
  Download,
  GraduationCap,
  Key,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from '../lib/icons'

export function Admin() {
  const [activeTab, setActiveTab] = useState<'requests' | 'teachers' | 'system'>('requests')
  const [metrics, setMetrics] = useState<any>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all')

  // Password Reset Modal
  const [resetModalTeacher, setResetModalTeacher] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [sysRes, teachRes] = await Promise.all([
        apiFetch<any>('/api/admin/metrics'),
        apiFetch<{ teachers: any[] }>('/api/admin/teachers'),
      ])

      if (sysRes?.metrics) {
        setMetrics(sysRes.metrics)
      } else if (sysRes) {
        setMetrics(sysRes)
      }

      setTeachers(teachRes?.teachers || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la administración')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (
    teacherId: string,
    status: 'active' | 'inactive' | 'banned',
    teacherName: string
  ) => {
    const actionLabel =
      status === 'active' ? 'aprobar/activar' : status === 'banned' ? 'suspender' : 'desactivar'
    if (!(await confirmAction(`¿Confirmas ${actionLabel} la cuenta del docente "${teacherName}"?`))) return

    try {
      await apiFetch(`/api/admin/teachers/${teacherId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })

      if (status === 'active') {
        sound.playVictory()
        triggerConfetti()
      } else {
        sound.playWheelTick()
      }

      await loadData()
    } catch (err: any) {
      notify(err.message || 'Error al actualizar el estado del docente')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalTeacher || !newPassword.trim()) return

    setIsResetting(true)
    try {
      const res = await apiFetch<{ success: boolean; password: string }>(
        `/api/admin/teachers/${resetModalTeacher.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ newPassword: newPassword.trim() }),
        }
      )

      sound.playPowerup()
      notifySuccess(
        `¡Contraseña actualizada exitosamente para el docente ${resetModalTeacher.displayName}!\nNueva clave: ${res.password}`
      )
      setResetModalTeacher(null)
      setNewPassword('')
      await loadData()
    } catch (err: any) {
      notify(err.message || 'Error al resetear la contraseña')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (
      !(await confirmAction(
        `¿Estás seguro de eliminar permanentemente la cuenta del docente "${teacherName}"? Se borrarán sus datos asociados.`
      ))
    )
      return

    try {
      await apiFetch(`/api/admin/teachers/${teacherId}`, { method: 'DELETE' })
      sound.playWheelTick()
      await loadData()
    } catch (err: any) {
      notify(err.message || 'Error al eliminar el docente')
    }
  }

  const handleCreateBackup = async () => {
    setIsBackingUp(true)
    try {
      const res = await apiFetch<any>('/api/backup/export', { method: 'POST' }).catch(() =>
        apiFetch<any>('/api/admin/backup', { method: 'POST' })
      )
      sound.playVictory()
      triggerConfetti()
      notifySuccess(`¡Copia de seguridad creada con éxito!\nArchivo: ${res.filename || 'backup-sqlite.json'}`)
    } catch (err: any) {
      notify(err.message || 'Error al generar la copia de seguridad')
    } finally {
      setIsBackingUp(false)
    }
  }

  const pendingTeachers = teachers.filter((t) => t.status === 'inactive')
  const approvedTeachers = teachers.filter((t) => t.status === 'active')
  const _bannedTeachers = teachers.filter((t) => t.status === 'banned')

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 select-none">
      {loading && <AsyncState loading />}
      {loadError && <AsyncState error={loadError} onRetry={loadData} />}
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-surface via-indigo-950/80 to-surface border border-line shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">
              Panel de Administración
            </h1>
            <Badge variant="primary">Webmaster</Badge>
          </div>
          <p className="text-xs text-muted">
            Control de altas docentes, gestión de contraseñas, telemetría y copias de seguridad de la base de
            datos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={loadData}
            isLoading={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleCreateBackup}
            isLoading={isBackingUp}
            className="gap-2 text-xs"
          >
            <Database className="w-4 h-4" />
            <span>Backup SQLite</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hoverEffect className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Docentes Activos</span>
            <Users className="w-4 h-4 text-success" />
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-success">
            {approvedTeachers.length}
          </div>
        </Card>

        <Card hoverEffect className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Solicitudes Pendientes
            </span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-warning">
            {pendingTeachers.length}
          </div>
        </Card>

        <Card hoverEffect className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Alumnos Registrados</span>
            <GraduationCap className="w-4 h-4 text-accent" />
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-accent">
            {metrics?.studentsCount || 0}
          </div>
        </Card>

        <Card hoverEffect className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Clases Creadas</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-cyan-400">
            {metrics?.classesCount || 0}
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <Button
          variant={activeTab === 'requests' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('requests')}
          className="gap-2 text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Solicitudes Pendientes ({pendingTeachers.length})</span>
        </Button>

        <Button
          variant={activeTab === 'teachers' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('teachers')}
          className="gap-2 text-xs"
        >
          <Users className="w-4 h-4" />
          <span>Directorio de Docentes ({teachers.length})</span>
        </Button>

        <Button
          variant={activeTab === 'system' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('system')}
          className="gap-2 text-xs"
        >
          <Activity className="w-4 h-4" />
          <span>Telemetría & Métricas</span>
        </Button>
      </div>

      {/* TAB 1: SOLICITUDES PENDIENTES */}
      {activeTab === 'requests' && (
        <Card className="space-y-4 p-6 border-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-xl text-foreground">
                Solicitudes de Registro Docente
              </h3>
              <p className="text-xs text-muted">
                Profesores que han completado el formulario de postulación y esperan aprobación.
              </p>
            </div>
            <Badge variant="warning">{pendingTeachers.length} en espera</Badge>
          </div>

          {pendingTeachers.length > 0 ? (
            <div className="space-y-3">
              {pendingTeachers.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canvas border border-line"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{t.displayName}</span>
                      <span className="text-xs font-mono text-accent">@{t.username}</span>
                    </div>
                    {t.bio && <p className="text-xs text-muted">{t.bio}</p>}
                    <span className="text-[10px] text-muted block">
                      Registrado: {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdateStatus(t.id, 'active', t.displayName)}
                      className="gap-1 text-xs text-foreground"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprobar Cuenta</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setResetModalTeacher(t)
                        setNewPassword('docente123')
                      }}
                      className="gap-1 text-xs"
                    >
                      <Key className="w-3.5 h-3.5 text-warning" />
                      <span>Fijar Clave</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUpdateStatus(t.id, 'banned', t.displayName)}
                      className="gap-1 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-canvas/40 border border-line text-xs text-muted space-y-2">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <p>¡No hay solicitudes de registro pendientes!</p>
              <p className="text-muted">
                Cuando nuevos docentes se registren desde el portal de inicio, aparecerán aquí para tu
                revisión.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: DIRECTORIO DE DOCENTES */}
      {activeTab === 'teachers' && (
        <Card className="space-y-4 p-6 border-line">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-xl text-foreground">Directorio Docente</h3>
              <p className="text-xs text-muted">
                Administra todos los profesores registrados, modifica su estado o restablece sus contraseñas.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Buscar por nombre o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="w-40">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val: any) => setStatusFilter(val)}
                  options={[
                    { value: 'all', label: 'Todos los estados' },
                    { value: 'active', label: 'Activos' },
                    { value: 'inactive', label: 'Pendientes' },
                    { value: 'banned', label: 'Suspendidos' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-muted font-bold uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="p-4">Docente</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Clases</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-elevated/30 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-foreground block">{t.displayName}</span>
                      {t.bio && <span className="text-[11px] text-muted line-clamp-1">{t.bio}</span>}
                    </td>
                    <td className="p-4 font-mono text-accent">{t.username}</td>
                    <td className="p-4">
                      <span className="font-bold text-foreground">{t.classesCount || 0}</span> clases
                    </td>
                    <td className="p-4">
                      {t.status === 'active' && <Badge variant="success">Activo</Badge>}
                      {t.status === 'inactive' && <Badge variant="warning">Pendiente</Badge>}
                      {t.status === 'banned' && <Badge variant="danger">Suspendido</Badge>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {t.status === 'inactive' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleUpdateStatus(t.id, 'active', t.displayName)}
                          className="gap-1 text-xs text-foreground"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </Button>
                      )}

                      {t.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(t.id, 'banned', t.displayName)}
                          className="gap-1 text-xs text-danger hover:text-danger"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspender</span>
                        </Button>
                      )}

                      {t.status === 'banned' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateStatus(t.id, 'active', t.displayName)}
                          className="gap-1 text-xs text-success"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Reactivar</span>
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setResetModalTeacher(t)
                          setNewPassword('docente123')
                        }}
                        className="gap-1 text-xs"
                      >
                        <Key className="w-3.5 h-3.5 text-warning" />
                        <span>Cambiar Clave</span>
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTeacher(t.id, t.displayName)}
                        className="gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      No se encontraron docentes con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: TELEMETRÍA Y SISTEMA */}
      {activeTab === 'system' && (
        <Card className="space-y-6 p-6 border-line">
          <h3 className="font-display font-bold text-xl text-foreground">Métricas del Servidor & Entorno</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-canvas border border-line space-y-1">
              <span className="text-xs text-muted block font-semibold">Total de Usuarios</span>
              <span className="font-display font-black text-2xl text-foreground">
                {metrics?.usersCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-line space-y-1">
              <span className="text-xs text-muted block font-semibold">Lecciones Activas</span>
              <span className="font-display font-black text-2xl text-foreground">
                {metrics?.lessonsCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-canvas border border-line space-y-1">
              <span className="text-xs text-muted block font-semibold">Sesiones de Juego en Vivo</span>
              <span className="font-display font-black text-2xl text-foreground">
                {metrics?.sessionsCount || 0}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-canvas/70 border border-line text-xs text-muted space-y-2">
            <div className="flex items-center justify-between border-b border-line/80 pb-2">
              <span>Versión de Node/Bun Runtime:</span>
              <span className="font-mono text-foreground">{metrics?.nodeVersion || process.version}</span>
            </div>
            <div className="flex items-center justify-between border-b border-line/80 pb-2">
              <span>Plataforma del Servidor:</span>
              <span className="font-mono text-foreground">{metrics?.platform || process.platform}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Tiempo de Actividad (Uptime):</span>
              <span className="font-mono text-foreground">{metrics?.uptimeSec || 0} segundos</span>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA DE DOCENTE */}
      <Dialog
        open={Boolean(resetModalTeacher)}
        onOpenChange={(open) => {
          if (!open) setResetModalTeacher(null)
        }}
        title={`Cambiar Contraseña: ${resetModalTeacher?.displayName || ''}`}
        description={`Asigna una nueva clave de acceso para el usuario @${resetModalTeacher?.username || ''}.`}
        className="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label
              className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5"
              htmlFor="admin-field-1"
            >
              Nueva Contraseña
            </label>
            <Input
              id="admin-field-1"
              type="text"
              placeholder="Ej: docente2026 o claveSegura123"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <Button type="button" variant="ghost" onClick={() => setResetModalTeacher(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isResetting} disabled={!newPassword.trim()}>
              Actualizar Contraseña
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
