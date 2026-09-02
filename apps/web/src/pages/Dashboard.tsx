import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Edit3,
  EyeOff,
  Globe,
  Heart,
  HelpCircle,
  Key,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Printer,
  QrCode as QrCodeIcon,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AiGeneratorModal } from '../components/ai/AiGeneratorModal'
import { AiSettingsTab } from '../components/ai/AiSettingsTab'
import { ClassEditModal } from '../components/classes/ClassEditModal'
import { PublishToForumModal } from '../components/forum/PublishToForumModal'
import { HomeworkAssignModal } from '../components/homework/HomeworkAssignModal'
import { HomeworkEditModal } from '../components/homework/HomeworkEditModal'
import { ExerciseBuilderModal } from '../components/lessons/ExerciseBuilderModal'
import { LessonModal } from '../components/lessons/LessonModal'
import { LeaderboardTab } from '../components/ranking/LeaderboardTab'
import { StudentEditModal } from '../components/students/StudentEditModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { QrCode as QrCodeCard } from '../components/ui/QrCode'
import { CustomSelect } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'

export function Dashboard() {
  const { user, isLocalMode } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('classes')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [lessons, setLessons] = useState<any[]>([])
  const [wallPosts, setWallPosts] = useState<any[]>([])
  const [homeworkList, setHomeworkList] = useState<any[]>([])
  const [gradebook, setGradebook] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])

  // Expanded lesson exercises view
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
  const [lessonExercisesMap, setLessonExercisesMap] = useState<{ [key: string]: any[] }>({})

  // Modals state - Classes CRUD
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [isEditClassOpen, setIsEditClassOpen] = useState(false)
  const [classToEdit, setClassToEdit] = useState<any>(null)
  const [qrModalData, setQrModalData] = useState<{ title: string; code: string; url: string } | null>(null)

  // Modals state - Lessons CRUD & Multimedia
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [lessonToEdit, setLessonToEdit] = useState<any>(null)

  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [selectedLessonForAi, setSelectedLessonForAi] = useState<string>('')

  // Manual Exercise Builder modal
  const [isManualBuilderOpen, setIsManualBuilderOpen] = useState(false)
  const [selectedLessonForManualBuilder, setSelectedLessonForManualBuilder] = useState<string>('')
  const [exerciseToEdit, setExerciseToEdit] = useState<any>(null)

  // Homework CRUD modals
  const [isAssignHomeworkOpen, setIsAssignHomeworkOpen] = useState(false)
  const [isEditHomeworkOpen, setIsEditHomeworkOpen] = useState(false)
  const [homeworkToEdit, setHomeworkToEdit] = useState<any>(null)

  // Publish to Forum modal
  const [isPublishForumOpen, setIsPublishForumOpen] = useState(false)
  const [selectedLessonForForum, setSelectedLessonForForum] = useState<string>('')

  // Student CRUD modals
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false)
  const [studentDisplayName, setStudentDisplayName] = useState('')
  const [studentUsername, setStudentUsername] = useState('')
  const [studentPassword, setStudentPassword] = useState('alumno123')
  const [createdStudentInfo, setCreatedStudentInfo] = useState<{
    displayName: string
    username: string
    password: string
  } | null>(null)

  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false)
  const [studentToEdit, setStudentToEdit] = useState<any>(null)

  // Password reset modal
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetTargetStudent, setResetTargetStudent] = useState<any>(null)
  const [newResetPassword, setNewResetPassword] = useState('')

  // Printable credentials modal
  const [isPrintCardsOpen, setIsPrintCardsOpen] = useState(false)
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null)

  // Wall post state
  const [newPostContent, setNewPostContent] = useState('')

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await apiFetch<{ classes: any[] }>('/api/classes')
      setClasses(res.classes)
      if (res.classes.length > 0 && !selectedClassId) {
        setSelectedClassId(res.classes[0].id)
      }
    } catch {
      // ignore
    }
  }

  const loadLessonExercises = async (lessonId: string) => {
    try {
      const res = await apiFetch<{ exercises: any[] }>(`/api/lessons/${lessonId}/exercises`)
      setLessonExercisesMap((prev) => ({ ...prev, [lessonId]: res.exercises }))
    } catch {
      // ignore
    }
  }

  const loadClassData = () => {
    if (!selectedClassId) return

    // Load lessons
    apiFetch<{ lessons: any[] }>(`/api/groups/${selectedClassId}/lessons`)
      .then((res) => {
        setLessons(res.lessons)
        for (const l of res.lessons) {
          loadLessonExercises(l.id)
        }
      })
      .catch(() => setLessons([]))

    // Load Wall Posts
    apiFetch<{ posts: any[] }>(`/api/classes/${selectedClassId}/wall/posts`)
      .then((res) => setWallPosts(res.posts))
      .catch(() => setWallPosts([]))

    // Load Homework
    apiFetch<{ homework: any[] }>(`/api/classes/${selectedClassId}/homework`)
      .then((res) => setHomeworkList(res.homework))
      .catch(() => setHomeworkList([]))

    // Load Granular Gradebook & Analytics
    apiFetch<{ gradebook: any }>(`/api/classes/${selectedClassId}/gradebook`)
      .then((res) => {
        setGradebook(res.gradebook)
        setStudents(res.gradebook.students || [])
      })
      .catch(() => {
        setGradebook(null)
        setStudents([])
      })
  }

  // Load Class details whenever selectedClassId changes
  useEffect(() => {
    loadClassData()
  }, [selectedClassId])

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName) return

    try {
      const res = await apiFetch<{ class: any }>('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ name: newClassName }),
      })
      sound.playCorrect()
      setIsCreateClassOpen(false)
      setNewClassName('')
      await loadClasses()
      setSelectedClassId(res.class.id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`¿Estás seguro de eliminar la clase "${className}"? Esta acción no se puede deshacer.`))
      return
    try {
      await apiFetch(`/api/classes/${classId}`, { method: 'DELETE' })
      sound.playWheelTick()
      await loadClasses()
      if (selectedClassId === classId) {
        setSelectedClassId('')
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la clase')
    }
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al alumno "${studentName}" de la clase?`)) return
    try {
      await apiFetch(`/api/classes/${selectedClassId}/students/${studentId}`, {
        method: 'DELETE',
      })
      sound.playWheelTick()
      loadClassData()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar estudiante')
    }
  }

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`¿Estás seguro de eliminar la lección "${lessonTitle}" y todos sus ejercicios?`)) return
    try {
      await apiFetch(`/api/groups/${selectedClassId}/lessons/${lessonId}`, { method: 'DELETE' })
      sound.playWheelTick()
      loadClassData()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la lección')
    }
  }

  const handleTogglePublishLesson = async (lesson: any, exercisesCount: number) => {
    if (lesson.status === 'draft') {
      if (exercisesCount === 0) {
        alert(
          'Esta lección aún no tiene ejercicios. Añade al menos un ejercicio (manual o con IA) antes de publicarla a tus alumnos.'
        )
        return
      }
      try {
        await apiFetch(`/api/lessons/${lesson.id}/publish`, { method: 'POST' })
        sound.playVictory()
        triggerConfetti()
        loadClassData()
      } catch (err: any) {
        alert(err.message || 'Error al publicar la lección')
      }
    } else {
      if (
        !confirm(
          `¿Deseas despublicar la lección "${lesson.title}" y pasarla a borrador? Los alumnos ya no la verán en su temario.`
        )
      )
        return
      try {
        await apiFetch(`/api/groups/${selectedClassId}/lessons/${lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'draft' }),
        })
        sound.playWheelTick()
        loadClassData()
      } catch (err: any) {
        alert(err.message || 'Error al despublicar la lección')
      }
    }
  }

  const handleDeleteHomework = async (homeworkId: string, homeworkTitle: string) => {
    if (!confirm(`¿Estás seguro de eliminar la tarea "${homeworkTitle}"?`)) return
    try {
      await apiFetch(`/api/classes/${selectedClassId}/homework/${homeworkId}`, { method: 'DELETE' })
      sound.playWheelTick()
      loadClassData()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la tarea')
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentDisplayName || !studentUsername || !selectedClassId) return

    const cleanDisplayName = studentDisplayName.trim()
    const cleanUsername = studentUsername.trim().toLowerCase()
    const cleanPassword = studentPassword ? studentPassword.trim() : 'alumno123'

    try {
      await apiFetch(`/api/classes/${selectedClassId}/students`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: cleanDisplayName,
          username: cleanUsername,
          password: cleanPassword,
        }),
      })
      sound.playVictory()
      triggerConfetti()
      setIsCreateStudentOpen(false)
      setStudentDisplayName('')
      setStudentUsername('')
      setStudentPassword('alumno123')

      // Save credentials to show immediate confirmation modal
      setCreatedStudentInfo({
        displayName: cleanDisplayName,
        username: cleanUsername,
        password: cleanPassword,
      })

      // Reload gradebook/students
      const gbRes = await apiFetch<{ gradebook: any }>(`/api/classes/${selectedClassId}/gradebook`)
      setGradebook(gbRes.gradebook)
      setStudents(gbRes.gradebook.students || [])
    } catch (err: any) {
      alert(err.message || 'Error al crear estudiante')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetStudent || !newResetPassword) return

    try {
      await apiFetch(
        `/api/classes/students/${resetTargetStudent.studentId || resetTargetStudent.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ newPassword: newResetPassword.trim() }),
        }
      )
      sound.playPowerup()
      setIsResetPasswordOpen(false)
      setResetTargetStudent(null)
      setNewResetPassword('')
      loadClassData()
    } catch (err: any) {
      alert(err.message || 'Error al restablecer contraseña')
    }
  }

  const handleDeleteExercise = async (lessonId: string, exerciseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return
    try {
      await apiFetch(`/api/exercises/${exerciseId}`, { method: 'DELETE' })
      sound.playWheelTick()
      loadLessonExercises(lessonId)
    } catch (err: any) {
      alert(err.message || 'Error al eliminar ejercicio')
    }
  }

  // Launch session modal
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)
  const [selectedLessonForLaunch, setSelectedLessonForLaunch] = useState<string>('')
  const [launchMode, setLaunchMode] = useState<string>('trivia')
  const [tournamentSize, setTournamentSize] = useState(5)

  const handleLaunchSession = async (lessonId: string) => {
    setSelectedLessonForLaunch(lessonId)
    setLaunchMode('trivia')
    setTournamentSize(5)
    setIsLaunchModalOpen(true)
  }

  const handleConfirmLaunch = async () => {
    if (!selectedLessonForLaunch) return
    try {
      const body: any = {
        classId: selectedClassId,
        lessonId: selectedLessonForLaunch,
        mode: launchMode,
      }
      if (launchMode === 'tournament') {
        body.tournamentSize = tournamentSize
      }
      const res = await apiFetch<{ session: any }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      sound.playPowerup()
      setIsLaunchModalOpen(false)
      const targetSessionId = res.session?.sessionId || res.session?.id || res.session
      navigate(`/host/${targetSessionId}`)
    } catch (err: any) {
      alert(err.message || 'Error al lanzar partida')
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent || !selectedClassId) return

    try {
      await apiFetch(`/api/classes/${selectedClassId}/wall/posts`, {
        method: 'POST',
        body: JSON.stringify({ content: newPostContent }),
      })
      sound.playCorrect()
      setNewPostContent('')
      const res = await apiFetch<{ posts: any[] }>(`/api/classes/${selectedClassId}/wall/posts`)
      setWallPosts(res.posts)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId)

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Panel del Docente
            </h1>
            <Badge variant="primary">{isLocalMode ? 'Modo Local' : 'Modo Hosted'}</Badge>
          </div>
          <p className="text-slate-400 text-sm">
            Bienvenido, <span className="text-indigo-400 font-bold">{user?.displayName}</span>. Gestiona tus
            clases, crea contenidos multimedia y lidera partidas en vivo.
          </p>
        </div>

        {/* Global Class Selector */}
        {classes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
              {t('dashboard.selectClass')}
            </span>
            <div className="w-full sm:w-64 max-w-full">
              <CustomSelect
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                options={classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        options={[
          { value: 'classes', label: t('dashboard.tabs.classes'), icon: <BookOpen className="w-4 h-4" /> },
          { value: 'students', label: t('dashboard.tabs.students'), icon: <Users className="w-4 h-4" /> },
          { value: 'lessons', label: t('dashboard.tabs.lessons'), icon: <Sparkles className="w-4 h-4" /> },
          {
            value: 'homework',
            label: t('dashboard.tabs.homework'),
            icon: <ClipboardList className="w-4 h-4" />,
          },
          { value: 'ranking', label: t('dashboard.tabs.ranking'), icon: <Trophy className="w-4 h-4" /> },
          {
            value: 'gradebook',
            label: t('dashboard.tabs.gradebook'),
            icon: <BarChart3 className="w-4 h-4" />,
          },
          { value: 'wall', label: t('dashboard.tabs.wall'), icon: <MessageSquare className="w-4 h-4" /> },
          { value: 'ai_config', label: t('dashboard.tabs.ai_config'), icon: <Bot className="w-4 h-4" /> },
        ]}
      />

      {/* TAB 1: MIS CLASES (CRUD COMPLETO) */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-white">Mis Clases Registradas</h3>
              <p className="text-xs text-slate-400">Crea, edita o administra los grupos escolares.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsCreateClassOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Crear Nueva Clase</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                hoverEffect
                onClick={() => setSelectedClassId(cls.id)}
                className={`space-y-4 cursor-pointer transition-all ${
                  selectedClassId === cls.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-xl text-white">{cls.name}</span>
                  <Badge variant="primary">{cls.code}</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {cls.studentCount || students.length} Alumnos
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    {cls.lessonCount || lessons.length} Lecciones
                  </span>
                </div>

                {/* Class Actions */}
                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setQrModalData({
                        title: `Código de Acceso: ${cls.name}`,
                        code: cls.code,
                        url: `${window.location.origin}/join?code=${cls.code}`,
                      })
                    }
                    className="gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    title="Ver Código QR para unirse a la clase"
                  >
                    <QrCodeIcon className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setClassToEdit(cls)
                      setIsEditClassOpen(true)
                    }}
                    className="gap-1 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    className="gap-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ALUMNOS & CREDENCIALES (CRUD COMPLETO) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                Roster de Alumnos • {selectedClass?.name || 'Clase'}
              </h3>
              <p className="text-xs text-slate-400">
                Gestiona las credenciales de tus alumnos sin necesidad de correos ni SMTP.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPrintCardsOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Tarjetas</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateStudentOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Alumno</span>
              </Button>
            </div>
          </div>

          {/* Students Table */}
          <Card className="overflow-hidden p-0 border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {students.map((st) => (
                    <tr key={st.studentId || st.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-white text-sm">{st.displayName}</td>
                      <td className="p-4 font-mono text-indigo-300">{st.username}</td>
                      <td className="p-4">
                        <Badge variant="success">Activo</Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setStudentToEdit({
                              id: st.studentId || st.id,
                              displayName: st.displayName,
                              username: st.username,
                            })
                            setIsEditStudentOpen(true)
                          }}
                          className="gap-1 text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Editar</span>
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setResetTargetStudent(st)
                            setNewResetPassword('alumno123')
                            setIsResetPasswordOpen(true)
                          }}
                          className="gap-1 text-xs"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cambiar Clave</span>
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteStudent(st.studentId || st.id, st.displayName)}
                          className="gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {students.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        No hay alumnos matriculados en esta clase aún. Haz clic en "+ Crear Alumno".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: LECCIONES, TEMARIOS & MULTIMEDIA (CRUD COMPLETO) */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                Lecciones de {selectedClass?.name || 'la clase'}
              </h3>
              <p className="text-xs text-slate-400">
                Diseña ejercicios manualmente o con IA, sube PDFs/imágenes y lánzalas al Datashow.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setLessonToEdit(null)
                setIsLessonModalOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Lección</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {lessons.map((lesson) => {
              const exercisesList = lessonExercisesMap[lesson.id] || []
              const isExpanded = expandedLessonId === lesson.id

              return (
                <Card key={lesson.id} className="space-y-4 p-6 border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-xl text-white">{lesson.title}</h4>
                        <Badge variant={lesson.status === 'published' ? 'success' : 'warning'}>
                          {lesson.status === 'published' ? 'Publicada para Alumnos' : 'Borrador'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {lesson.materialContent || 'Sin material temático adjunto'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* 1. Launch in Datashow */}
                      <Button
                        variant="game"
                        size="sm"
                        onClick={() => handleLaunchSession(lesson.id)}
                        className="gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/20"
                      >
                        <Tv className="w-4 h-4" />
                        <span>Lanzar en Datashow</span>
                      </Button>

                      {/* 2. Publish / Unpublish for Class Students */}
                      {lesson.status === 'draft' ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleTogglePublishLesson(lesson, exercisesList.length)}
                          className="gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                          title="Publicar lección para que esté disponible para los alumnos de la clase"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Publicar para Alumnos</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTogglePublishLesson(lesson, exercisesList.length)}
                          className="gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                          title="Despublicar y regresar a estado Borrador (oculta la lección a los alumnos)"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Despublicar (Borrador)</span>
                        </Button>
                      )}

                      {/* 3. Edit Lesson Details */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setLessonToEdit(lesson)
                          setIsLessonModalOpen(true)
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Editar Temario & Multimedia</span>
                      </Button>

                      {/* 4. Publish / Share to Community Forum */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedLessonForForum(lesson.id)
                          setIsPublishForumOpen(true)
                        }}
                        className="gap-1.5 text-xs text-purple-300 hover:text-purple-200"
                        title="Compartir lección con la comunidad docente de profesores"
                      >
                        <Share2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Compartir en Foro</span>
                      </Button>

                      {/* 5. Delete Lesson */}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                        className="gap-1.5 text-xs"
                        title="Eliminar lección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  </div>

                  {/* Actions to Add Exercises */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedLessonForManualBuilder(lesson.id)
                          setExerciseToEdit(null)
                          setIsManualBuilderOpen(true)
                        }}
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Ejercicio Manual</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedLessonForAi(lesson.id)
                          setIsAiModalOpen(true)
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Generar con IA</span>
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{exercisesList.length} Ejercicios en esta lección</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Accordion List of Exercises with Edit & Delete */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-3 border-t border-slate-800/60 overflow-hidden"
                      >
                        {exercisesList.map((ex, _idx) => (
                          <div
                            key={ex.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="primary" className="text-[10px] uppercase font-bold">
                                  {ex.type}
                                </Badge>
                                <span className="font-bold text-white">{ex.prompt}</span>
                              </div>
                              {ex.explanation && (
                                <p className="text-[11px] text-slate-400 italic">{ex.explanation}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-400 text-[11px] mr-2">
                                {ex.points || 1} pts • {ex.timeSec || 30}s
                              </span>

                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedLessonForManualBuilder(lesson.id)
                                  setExerciseToEdit(ex)
                                  setIsManualBuilderOpen(true)
                                }}
                                className="gap-1 text-[10px] py-1 px-2"
                              >
                                <Edit3 className="w-3 h-3 text-indigo-400" />
                                <span>Editar</span>
                              </Button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExercise(lesson.id, ex.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {exercisesList.length === 0 && (
                          <p className="text-xs text-slate-500 text-center py-2">
                            Aún no hay ejercicios en esta lección. Haz clic en <b>"+ Ejercicio Manual"</b>{' '}
                            para agregar uno.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TAREAS & ACTIVIDADES (CRUD COMPLETO) */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-black text-xl text-white">Tareas & Actividades Asignadas</h3>
              <p className="text-xs text-slate-400">
                Programa cuestionarios interactivos, lecturas guiadas o debates escolares con fecha límite.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAssignHomeworkOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Asignar Nueva Tarea</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {homeworkList.map((hw) => (
              <Card key={hw.id} hoverEffect className="space-y-3 p-6 border-slate-800">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-lg text-white">{hw.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400">Lección: {hw.lessonTitle}</p>
                  </div>

                  <Badge
                    variant={
                      hw.kind === 'reading' ? 'secondary' : hw.kind === 'discussion' ? 'warning' : 'primary'
                    }
                    className="text-xs capitalize"
                  >
                    {hw.kind === 'reading' ? 'Lectura' : hw.kind === 'discussion' ? 'Debate' : 'Cuestionario'}
                  </Badge>
                </div>

                {hw.instructions && (
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    {hw.instructions}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>Entrega: {new Date(hw.dueAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setHomeworkToEdit(hw)
                        setIsEditHomeworkOpen(true)
                      }}
                      className="gap-1 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Editar</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteHomework(hw.id, hw.title)}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {homeworkList.length === 0 && (
              <div className="col-span-2 p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
                <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white">No hay tareas asignadas para esta clase</h4>
                <p className="text-xs text-slate-400">
                  Haz clic en <b>"+ Asignar Nueva Tarea"</b> para programar un cuestionario, lectura o debate
                  escolar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RANKING & SALÓN DE LA FAMA */}
      {activeTab === 'ranking' && <LeaderboardTab currentClassId={selectedClassId} classes={classes} />}

      {/* TAB 6: CALIFICADOR & ANALÍTICAS GRANULARES */}
      {activeTab === 'gradebook' && gradebook && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-black text-2xl text-white">
                Calificador & Analíticas • {gradebook.className}
              </h3>
              <p className="text-xs text-slate-400">
                Evaluación individual, diagnóstico de conceptos difíciles y descarga de actas oficiales.
              </p>
            </div>

            <a href={`/api/classes/${selectedClassId}/gradebook/export`} download>
              <Button variant="primary" size="md" className="gap-2">
                <Download className="w-4 h-4" />
                <span>Exportar a Excel (CSV)</span>
              </Button>
            </a>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card hoverEffect className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Precisión Promedio
              </span>
              <div className="font-display font-black text-3xl text-emerald-400">
                {gradebook.summary.classAverageAccuracy}%
              </div>
            </Card>
            <Card hoverEffect className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alumnos Evaluados
              </span>
              <div className="font-display font-black text-3xl text-indigo-400">
                {gradebook.summary.totalStudents}
              </div>
            </Card>
            <Card hoverEffect className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Respuestas
              </span>
              <div className="font-display font-black text-3xl text-purple-400">
                {gradebook.summary.totalAnswers}
              </div>
            </Card>
            <Card hoverEffect className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alertas Anti-trampa
              </span>
              <div className="font-display font-black text-3xl text-amber-400">
                {gradebook.summary.totalAnticheatAlerts}
              </div>
            </Card>
          </div>

          {/* Granular Student Gradebook Table */}
          <Card className="overflow-hidden p-0 border-slate-800">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Acta de Calificaciones por Estudiante</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Nota (0-100)</th>
                    <th className="p-4">Aciertos %</th>
                    <th className="p-4">Tareas Hechas</th>
                    <th className="p-4">Velocidad Promedio</th>
                    <th className="p-4">Alertas Trampa</th>
                    <th className="p-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {gradebook.students.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block">{s.displayName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{s.username}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-display font-black text-base text-indigo-300">
                          {s.calculatedGrade}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">{s.accuracyPercent}%</td>
                      <td className="p-4 text-slate-300">
                        {s.homeworkCompleted} / {gradebook.summary.totalHomework}
                      </td>
                      <td className="p-4 text-slate-300">{s.avgLatencySec}s</td>
                      <td className="p-4">
                        {s.anticheatAlerts > 0 ? (
                          <Badge variant="warning" className="text-[10px]">
                            {s.anticheatAlerts} alertas
                          </Badge>
                        ) : (
                          <span className="text-emerald-400 font-semibold">0 (Limpio)</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Badge
                          variant={
                            s.statusTag === 'excelente'
                              ? 'success'
                              : s.statusTag === 'aprobado'
                                ? 'primary'
                                : 'warning'
                          }
                          className="capitalize"
                        >
                          {s.statusTag}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: MURO SOCIAL */}
      {activeTab === 'wall' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <form
            onSubmit={handleCreatePost}
            className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span>Publicar Anuncio o Tema de Discusión en el Muro</span>
            </h3>
            <textarea
              rows={3}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={`¿Qué deseas compartir con la clase ${selectedClass?.name || ''}?`}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!newPostContent.trim()} className="gap-2">
                <Send className="w-4 h-4" />
                <span>Publicar Mensaje</span>
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            {wallPosts.map((post) => (
              <Card key={post.id} className="space-y-3 p-6 border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {post.authorName ? post.authorName[0] : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">{post.authorName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {post.isPinned && (
                    <Badge variant="warning" className="gap-1">
                      <Pin className="w-3 h-3" />
                      <span>Fijado</span>
                    </Badge>
                  )}
                </div>
                <p className="text-slate-200 text-sm">{post.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: CONFIGURACIÓN DE IA */}
      {activeTab === 'ai_config' && <AiSettingsTab />}

      {/* MODAL 1: CREAR CLASE */}
      <Dialog
        open={isCreateClassOpen}
        onOpenChange={setIsCreateClassOpen}
        title="Crear Nueva Clase"
        className="max-w-md"
      >
        <form onSubmit={handleCreateClass} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nombre del Grupo / Materia
            </label>
            <Input
              placeholder="Ej: Ciencias Naturales 5to A"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateClassOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Crear Clase
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: EDITAR CLASE */}
      <ClassEditModal
        open={isEditClassOpen}
        onOpenChange={(open) => {
          setIsEditClassOpen(open)
          if (!open) setClassToEdit(null)
        }}
        cls={classToEdit}
        onClassUpdated={loadClasses}
      />

      {/* MODAL 3: CREAR ESTUDIANTE */}
      <Dialog
        open={isCreateStudentOpen}
        onOpenChange={setIsCreateStudentOpen}
        title="Matricular Nuevo Estudiante"
        className="max-w-md"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nombre y Apellidos
            </label>
            <Input
              placeholder="Ej: Lucas Martínez"
              value={studentDisplayName}
              onChange={(e) => setStudentDisplayName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nombre de Usuario (Para Login)
            </label>
            <Input
              placeholder="Ej: lucas.martinez"
              value={studentUsername}
              onChange={(e) => setStudentUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Contraseña Inicial
            </label>
            <Input
              type="text"
              value={studentPassword}
              onChange={(e) => setStudentPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateStudentOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Alumno
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 4: EDITAR ESTUDIANTE */}
      <StudentEditModal
        open={isEditStudentOpen}
        onOpenChange={(open) => {
          setIsEditStudentOpen(open)
          if (!open) setStudentToEdit(null)
        }}
        student={studentToEdit}
        classId={selectedClassId}
        onStudentUpdated={loadClassData}
      />

      {/* MODAL 5: CAMBIAR CONTRASEÑA */}
      <Dialog
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        title={`Cambiar Clave: ${resetTargetStudent?.displayName || ''}`}
        className="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nueva Contraseña
            </label>
            <Input
              type="text"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsResetPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Actualizar Clave
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 6: LECCIONES & MULTIMEDIA (CREAR / EDITAR) */}
      <LessonModal
        open={isLessonModalOpen}
        onOpenChange={(open) => {
          setIsLessonModalOpen(open)
          if (!open) setLessonToEdit(null)
        }}
        classId={selectedClassId}
        lessonToEdit={lessonToEdit}
        onLessonSaved={loadClassData}
      />

      {/* MODAL 7: CONSTRUCTOR MANUAL DE EJERCICIOS (CREAR / EDITAR) */}
      {isManualBuilderOpen && (
        <ExerciseBuilderModal
          open={isManualBuilderOpen}
          onOpenChange={(open) => {
            setIsManualBuilderOpen(open)
            if (!open) setExerciseToEdit(null)
          }}
          lessonId={selectedLessonForManualBuilder}
          exerciseToEdit={exerciseToEdit}
          onExerciseCreated={() => {
            loadLessonExercises(selectedLessonForManualBuilder)
          }}
        />
      )}

      {/* MODAL 8: ASIGNAR TAREA */}
      <HomeworkAssignModal
        open={isAssignHomeworkOpen}
        onOpenChange={setIsAssignHomeworkOpen}
        classId={selectedClassId}
        classes={classes}
        lessons={lessons}
        onHomeworkAssigned={loadClassData}
      />

      {/* MODAL 9: EDITAR TAREA */}
      <HomeworkEditModal
        open={isEditHomeworkOpen}
        onOpenChange={(open) => {
          setIsEditHomeworkOpen(open)
          if (!open) setHomeworkToEdit(null)
        }}
        classId={selectedClassId}
        homework={homeworkToEdit}
        onHomeworkUpdated={loadClassData}
      />

      {/* MODAL 10: PUBLICAR EN FORO */}
      <PublishToForumModal
        open={isPublishForumOpen}
        onOpenChange={setIsPublishForumOpen}
        lessons={lessons}
        initialLessonId={selectedLessonForForum}
      />

      {/* MODAL 11: GENERADOR CON IA */}
      <AiGeneratorModal
        open={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        lessonId={selectedLessonForAi}
        onExercisesGenerated={() => {
          loadLessonExercises(selectedLessonForAi)
          loadClassData()
        }}
        hasMaterialFile={Boolean(lessons.find((l) => l.id === selectedLessonForAi)?.materialFile)}
      />
      {/* MODAL 3B: CONFIRMACIÓN DE ALUMNO CREADO Y CREDENCIALES */}
      <Dialog
        open={Boolean(createdStudentInfo)}
        onOpenChange={(open) => {
          if (!open) setCreatedStudentInfo(null)
        }}
        title="¡Estudiante Creado con Éxito!"
        description="Comparte estas credenciales con el alumno para que pueda acceder a AulaPlay de inmediato."
        className="max-w-md"
      >
        {createdStudentInfo && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Nombre Completo
                </span>
                <span className="font-bold text-white text-base">{createdStudentInfo.displayName}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Usuario de Acceso (Login)
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {createdStudentInfo.username}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdStudentInfo.username)
                    setCopiedNotification('¡Usuario copiado!')
                    setTimeout(() => setCopiedNotification(null), 2000)
                  }}
                  className="gap-1 text-xs text-indigo-400"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Contraseña Inicial
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {createdStudentInfo.password}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdStudentInfo.password)
                    setCopiedNotification('¡Contraseña copiada!')
                    setTimeout(() => setCopiedNotification(null), 2000)
                  }}
                  className="gap-1 text-xs text-emerald-400"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </Button>
              </div>
            </div>

            {copiedNotification && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-center text-xs text-emerald-300 font-semibold">
                {copiedNotification}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const text = `Alumno: ${createdStudentInfo.displayName}\nUsuario: ${createdStudentInfo.username}\nContraseña: ${createdStudentInfo.password}`
                  navigator.clipboard.writeText(text)
                  setCopiedNotification('¡Todas las credenciales copiadas!')
                  setTimeout(() => setCopiedNotification(null), 2000)
                }}
                className="gap-1.5 text-xs"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Todo</span>
              </Button>

              <Button variant="primary" size="sm" onClick={() => setCreatedStudentInfo(null)}>
                Listo / Entendido
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 12: IMPRIMIR TARJETAS DE ACCESO DE LA CLASE */}
      <Dialog
        open={isPrintCardsOpen}
        onOpenChange={setIsPrintCardsOpen}
        title={`Tarjetas de Acceso • ${selectedClass?.name || 'Clase'}`}
        description="Fichas de credenciales de los estudiantes para imprimir o entregar en clase."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Total: <b className="text-white">{students.length}</b> alumnos matriculados
            </span>
            <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
              <Printer className="w-4 h-4" />
              <span>Imprimir Fichas (Ctrl+P)</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {students.map((st) => (
              <div
                key={st.studentId || st.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="font-bold text-white text-xs">{st.displayName}</span>
                  <Badge variant="primary">AulaPlay</Badge>
                </div>
                <div className="text-[11px] space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Usuario:</span>
                    <span className="font-mono font-bold text-indigo-300">@{st.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Clave por defecto:</span>
                    <span className="font-mono font-bold text-emerald-300">alumno123</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Clase:</span>
                    <span className="font-semibold text-slate-200">{selectedClass?.name}</span>
                  </div>
                </div>
              </div>
            ))}

            {students.length === 0 && (
              <div className="col-span-2 p-8 text-center text-xs text-slate-500">
                No hay alumnos matriculados en esta clase para imprimir.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsPrintCardsOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 13: SELECCIONAR MODO DE JUEGO */}
      <Dialog
        open={isLaunchModalOpen}
        onOpenChange={setIsLaunchModalOpen}
        title="Seleccionar Modo de Juego"
        description="Elige cómo quieres proyectar esta lección a tus alumnos."
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'trivia', label: 'Trivia Clásica', desc: 'Quiz individual con ranking', icon: '🎯' },
              { value: 'race', label: 'Carrera', desc: 'Pura velocidad, sin bonus de racha', icon: '🏁' },
              { value: 'teams', label: 'Equipos', desc: '4 equipos comparten puntos', icon: '👥' },
              { value: 'battle', label: 'Batalla', desc: 'Equipos con bonus de racha', icon: '⚔️' },
              { value: 'tournament', label: 'Torneo', desc: 'Subset aleatorio de N preguntas', icon: '🏆' },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setLaunchMode(mode.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  launchMode === mode.value
                    ? 'bg-indigo-600/20 border-indigo-400 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className="font-bold text-white text-sm">{mode.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</div>
              </button>
            ))}
          </div>

          {launchMode === 'tournament' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Cantidad de preguntas del torneo
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={tournamentSize}
                onChange={(e) => setTournamentSize(Number(e.target.value))}
                className="text-sm"
              />
              <p className="text-[10px] text-slate-500">
                Se seleccionarán {tournamentSize} preguntas al azar de la lección.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsLaunchModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmLaunch} className="gap-2">
              <Tv className="w-4 h-4" />
              <span>Lanzar Partida</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL QR DE CLASE / ACCESO DIRECTO */}
      <Dialog
        open={Boolean(qrModalData)}
        onOpenChange={(open) => {
          if (!open) setQrModalData(null)
        }}
        title={qrModalData?.title || 'Código QR'}
        description="Los alumnos pueden escanear este código con su móvil para acceder directamente."
        className="max-w-sm"
      >
        {qrModalData && (
          <div className="flex flex-col items-center justify-center space-y-4 pt-2 text-center">
            <div className="p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl w-full">
              <span className="text-[10px] text-indigo-300 font-bold block mb-0.5 uppercase tracking-wider">
                CÓDIGO DE ACCESO:
              </span>
              <span className="font-display font-black text-3xl text-white tracking-widest">
                {qrModalData.code}
              </span>
            </div>

            <QrCodeCard value={qrModalData.url} size={180} />

            <div className="space-y-1 w-full">
              <span className="text-[11px] text-slate-400 block">Enlace directo:</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 truncate select-all">
                {qrModalData.url}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                navigator.clipboard.writeText(qrModalData.url)
                sound.playPowerup()
              }}
              className="w-full gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Enlace de Acceso</span>
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  )
}
