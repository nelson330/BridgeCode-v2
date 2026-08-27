import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Flame,
  Gamepad2,
  Heart,
  MessageSquare,
  Send,
  Sparkles,
  Swords,
  Trophy,
  Tv,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BattlesModal } from '../components/battles/BattlesModal'
import { AnswerControls } from '../components/game/AnswerControls'
import { ReadingViewerModal } from '../components/lessons/ReadingViewerModal'
import { LeaderboardTab } from '../components/ranking/LeaderboardTab'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { MarkdownText } from '../components/ui/MarkdownText'
import { CustomSelect } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { sound } from '../lib/audio-synth'
import { triggerConfetti } from '../lib/confetti'

export function StudentDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('homework')
  const [classes, setClasses] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [homeworkList, setHomeworkList] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [classLessons, setClassLessons] = useState<any[]>([])
  const [wallPosts, setWallPosts] = useState<any[]>([])
  const [newWallComment, setNewWallComment] = useState('')

  // Interactive Exercise Practice Modal (Quiz)
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
  const [currentHomework, setCurrentHomework] = useState<any>(null)
  const [lessonExercises, setLessonExercises] = useState<any[]>([])
  const [currentExIndex, setCurrentExIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<any>(null)
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation?: string } | null>(null)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [startTime, setStartTime] = useState(Date.now())

  // Multimedia Reading & PDF Viewer Modal
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false)
  const [readingLesson, setReadingLesson] = useState<any>(null)
  const [readingHomework, setReadingHomework] = useState<any>(null)

  // 1v1 Battle Arena Modal
  const [isBattlesModalOpen, setIsBattlesModalOpen] = useState(false)

  useEffect(() => {
    loadStudentData()
    const interval = setInterval(loadStudentData, 8000)
    return () => clearInterval(interval)
  }, [])

  const loadStudentData = async () => {
    try {
      const [clsRes, sessRes, hwRes] = await Promise.all([
        apiFetch<{ classes?: any[] }>('/api/student/classes').catch(() => ({ classes: [] })),
        apiFetch<{ activeSessions?: any[]; sessions?: any[] }>('/api/student/active-sessions').catch(() => ({
          activeSessions: [],
          sessions: [],
        })),
        apiFetch<{ homework?: any[] }>('/api/student/homework').catch(() => ({ homework: [] })),
      ])

      const loadedClasses = clsRes?.classes || []
      const loadedSessions = sessRes?.activeSessions || sessRes?.sessions || []
      const loadedHomework = hwRes?.homework || []

      setClasses(loadedClasses)
      setActiveSessions(loadedSessions)
      setHomeworkList(loadedHomework)

      if (loadedClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(loadedClasses[0].classId)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!selectedClassId) return

    apiFetch<{ lessons?: any[] }>(`/api/groups/${selectedClassId}/lessons`)
      .then((res) => setClassLessons(res?.lessons || []))
      .catch(() => setClassLessons([]))

    apiFetch<{ posts?: any[] }>(`/api/classes/${selectedClassId}/wall/posts`)
      .then((res) => setWallPosts(res?.posts || []))
      .catch(() => setWallPosts([]))
  }, [selectedClassId])

  const handleStartHomeworkQuiz = async (hw: any) => {
    try {
      sound.playPowerup()
      const res = await apiFetch<{ exercises: any[] }>(`/api/lessons/${hw.lessonId}/exercises`)
      if (!res.exercises || res.exercises.length === 0) {
        alert('Esta lección aún no contiene ejercicios para practicar.')
        return
      }

      setCurrentHomework(hw)
      setLessonExercises(res.exercises)
      setCurrentExIndex(0)
      setSelectedOption(null)
      setFeedback(null)
      setEarnedPoints(0)
      setStartTime(Date.now())
      setIsPracticeModalOpen(true)
    } catch (err: any) {
      alert(err.message || 'Error al iniciar la tarea')
    }
  }

  const handleSubmitPracticeAnswer = async () => {
    if (selectedOption === null || !currentHomework) return

    const currentEx = lessonExercises[currentExIndex]
    const latencyMs = Date.now() - startTime

    try {
      let answerJson = '{}'
      if (currentEx.type === 'mc' || currentEx.type === 'poll') {
        answerJson = JSON.stringify({ correctIndex: selectedOption })
      } else if (currentEx.type === 'tf') {
        answerJson = JSON.stringify({ isTrue: selectedOption === 0 })
      }

      const res = await apiFetch<{
        isCorrect: boolean
        pointsEarned: number
        explanation?: string
      }>(`/api/classes/${currentHomework.classId}/lessons/${currentHomework.lessonId}/practice`, {
        method: 'POST',
        body: JSON.stringify({
          exerciseId: currentEx.id,
          answerJson,
          latencyMs,
        }),
      })

      if (res.isCorrect) {
        sound.playCorrect()
        setEarnedPoints((prev) => prev + res.pointsEarned)
      } else {
        sound.playIncorrect()
      }

      setFeedback({
        isCorrect: res.isCorrect,
        explanation: res.explanation || currentEx.explanation,
      })
    } catch (err: any) {
      alert(err.message || 'Error al validar respuesta')
    }
  }

  const handleNextExercise = () => {
    if (currentExIndex + 1 < lessonExercises.length) {
      setCurrentExIndex((prev) => prev + 1)
      setSelectedOption(null)
      setFeedback(null)
      setStartTime(Date.now())
      sound.playPowerup()
    } else {
      // Finished all exercises
      sound.playVictory()
      triggerConfetti()
      setIsPracticeModalOpen(false)
      loadStudentData()
      alert(`¡Felicitaciones! Has completado la tarea sumando ${earnedPoints} puntos.`)
    }
  }

  const handleOpenReading = (lesson: any, hw?: any) => {
    setReadingLesson(lesson)
    setReadingHomework(hw || null)
    setIsReadingModalOpen(true)
    sound.playPowerup()
  }

  const handleConfirmReading = async () => {
    if (!readingLesson) return

    try {
      const classId = readingHomework?.classId || selectedClassId
      await apiFetch(`/api/classes/${classId}/lessons/${readingLesson.id}/reading/complete`, {
        method: 'POST',
      })

      sound.playVictory()
      triggerConfetti()
      setIsReadingModalOpen(false)
      await loadStudentData()
      alert('¡Lectura registrada como completada con éxito (+100 pts)!')
    } catch (err: any) {
      sound.playIncorrect()
      alert(err.message || 'Error al confirmar lectura')
    }
  }

  const handleCreateWallComment = async (postId: string) => {
    if (!newWallComment.trim() || !selectedClassId) return

    try {
      await apiFetch(`/api/classes/${selectedClassId}/wall/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newWallComment.trim() }),
      })
      sound.playCorrect()
      setNewWallComment('')
      const res = await apiFetch<{ posts: any[] }>(`/api/classes/${selectedClassId}/wall/posts`)
      setWallPosts(res.posts)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const currentExercise = lessonExercises[currentExIndex]

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 select-none">
      {/* Active Live Game Session Pulse Banner */}
      {(activeSessions || []).length > 0 && activeSessions[0] && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 border border-emerald-400/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center animate-bounce">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-950 font-black text-xs uppercase tracking-wider">
                  ¡Partida en Vivo!
                </span>
                <span className="font-mono font-bold text-sm bg-black/30 px-2 py-0.5 rounded-lg">
                  PIN: {activeSessions[0].codePin}
                </span>
              </div>
              <h2 className="font-display font-black text-2xl mt-1">{activeSessions[0].lessonTitle}</h2>
              <p className="text-xs text-emerald-100">
                Tu profesor ha iniciado una sala de juego interactiva para {activeSessions[0].className}.
              </p>
            </div>
          </div>

          <Button
            variant="game"
            size="lg"
            onClick={() => {
              if (user) {
                sessionStorage.setItem('ap_nickname', user.displayName || user.username)
                sessionStorage.setItem('ap_user_id', user.id)
              }
              navigate(`/play/${activeSessions[0].codePin}`)
            }}
            className="gap-2 bg-white text-emerald-900 hover:bg-slate-100 shadow-xl shadow-black/20 shrink-0 font-black text-sm"
          >
            <Tv className="w-5 h-5" />
            <span>Unirse a la Partida</span>
          </Button>
        </motion.div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
              {t('student.portalTitle')}
            </h1>
            <Badge variant="primary">Alumno</Badge>
          </div>
          <p className="text-xs text-slate-400">
            {t('student.welcome')}, <b className="text-white">{user?.displayName}</b> ({user?.username}) •
            Revisa tus tareas, lecturas y compite en el ranking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* 1v1 Battle Quick Launch Button */}
          <Button
            variant="game"
            size="md"
            onClick={() => setIsBattlesModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-rose-600 to-purple-600 text-white font-bold shadow-lg shadow-rose-500/20 shrink-0 justify-center text-xs sm:text-sm"
          >
            <Swords className="w-4 h-4" />
            <span>{t('student.battleLaunch')}</span>
          </Button>

          {/* Class Selector Dropdown */}
          {classes.length > 0 && (
            <div className="w-full sm:w-60 max-w-full">
              <CustomSelect
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                options={classes.map((c) => ({
                  value: c.classId,
                  label: `${c.className} (${c.classCode})`,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        options={[
          {
            value: 'homework',
            label: t('student.tabs.homework'),
            icon: <ClipboardList className="w-4 h-4" />,
          },
          { value: 'lessons', label: t('student.tabs.lessons'), icon: <BookOpen className="w-4 h-4" /> },
          {
            value: 'battles',
            label: t('student.tabs.battles'),
            icon: <Swords className="w-4 h-4 text-rose-400" />,
          },
          {
            value: 'ranking',
            label: t('student.tabs.ranking'),
            icon: <Trophy className="w-4 h-4 text-amber-400" />,
          },
          { value: 'wall', label: t('student.tabs.wall'), icon: <MessageSquare className="w-4 h-4" /> },
        ]}
      />

      {/* TAB 1: TAREAS ASIGNADAS */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xl text-white">Tareas de tus Clases</h3>
            <span className="text-xs text-slate-400">
              {homeworkList.filter((h) => !h.completed).length} Pendientes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {homeworkList.map((hw) => (
              <Card
                key={hw.id}
                hoverEffect
                className="space-y-4 p-6 border-slate-800 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-display font-black text-xl text-white">{hw.title}</h4>
                      <span className="text-xs text-slate-400">
                        {hw.className} • Lección: {hw.lessonTitle}
                      </span>
                    </div>

                    <Badge
                      variant={
                        hw.kind === 'reading' ? 'secondary' : hw.kind === 'discussion' ? 'warning' : 'primary'
                      }
                      className="text-xs shrink-0"
                    >
                      {hw.kind === 'reading'
                        ? 'Lectura'
                        : hw.kind === 'discussion'
                          ? 'Debate'
                          : 'Cuestionario'}
                    </Badge>
                  </div>

                  {hw.instructions && (
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      {hw.instructions}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Fecha límite: {new Date(hw.dueAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    {hw.completed ? (
                      <Badge variant="success" className="gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completada ({hw.score || 100} pts)
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">
                        Pendiente
                      </Badge>
                    )}
                  </div>

                  {/* Contextual Action Button */}
                  {hw.kind === 'reading' ? (
                    <Button
                      variant={hw.completed ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() =>
                        handleOpenReading(
                          { id: hw.lessonId, title: hw.lessonTitle, materialContent: hw.lessonMaterial },
                          hw
                        )
                      }
                      className="gap-1.5 text-xs"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{hw.completed ? 'Releer' : 'Realizar Lectura'}</span>
                    </Button>
                  ) : hw.kind === 'discussion' ? (
                    <Button
                      variant={hw.completed ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setActiveTab('wall')}
                      className="gap-1.5 text-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Ir al Muro y Participar</span>
                    </Button>
                  ) : (
                    <Button
                      variant={hw.completed ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleStartHomeworkQuiz(hw)}
                      className="gap-1.5 text-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{hw.completed ? 'Repetir Práctica' : 'Resolver Tarea'}</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}

            {homeworkList.length === 0 && (
              <div className="col-span-2 p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
                <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white">¡No tienes tareas pendientes!</h4>
                <p className="text-xs text-slate-400">
                  Buen trabajo. Revisa el temario o compite en una batalla 1v1.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEMARIO Y MATERIALES DE LECTURA */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xl text-white">Temario y Materiales de Estudio</h3>
            <span className="text-xs text-slate-400">{classLessons.length} Lecciones disponibles</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {classLessons.map((lesson) => (
              <Card key={lesson.id} hoverEffect className="space-y-4 p-6 border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-display font-black text-xl text-white">{lesson.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {lesson.materialContent || 'Material conceptual publicado por tu profesor.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReading(lesson)}
                      className="gap-1.5 text-xs"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Leer Apuntes & Ver PDFs</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {classLessons.length === 0 && (
              <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white">No hay lecciones publicadas</h4>
                <p className="text-xs text-slate-400">
                  Tu profesor aún no ha publicado contenidos para esta clase.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BATALLAS 1v1 */}
      {activeTab === 'battles' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400">
            <Swords className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-display font-black text-3xl text-white">Arena de Batallas 1v1</h3>
            <p className="text-xs text-slate-400">
              Desafía a tus compañeros o al <b>Ghost Replay</b> de tu clase en duelos de trivia contra reloj
              para ganar puntos XP.
            </p>
          </div>
          <Button
            variant="game"
            size="xl"
            onClick={() => setIsBattlesModalOpen(true)}
            className="gap-3 bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white font-black text-lg px-8 shadow-xl shadow-rose-500/30"
          >
            <Swords className="w-5 h-5 fill-current" />
            <span>¡Entrar a la Arena de Batallas!</span>
          </Button>
        </div>
      )}

      {/* TAB 4: RANKING & TABLA DE LÍDERES */}
      {activeTab === 'ranking' && (
        <LeaderboardTab
          currentClassId={selectedClassId}
          classes={classes.map((c) => ({ id: c.classId, name: c.className }))}
        />
      )}

      {/* TAB 5: MURO SOCIAL */}
      {activeTab === 'wall' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-4">
            {wallPosts.map((post) => (
              <Card key={post.id} className="space-y-4 p-6 border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {post.authorName ? post.authorName[0] : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">{post.authorName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {post.isPinned && <Badge variant="warning">Fijado por Profesor</Badge>}
                </div>

                <p className="text-slate-200 text-sm leading-relaxed">{post.content}</p>

                {/* Comments List */}
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Comentarios ({post.comments.length})
                    </span>
                    {post.comments.map((comm: any) => (
                      <div
                        key={comm.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300">{comm.authorName}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(comm.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-200">{comm.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newWallComment}
                    onChange={(e) => setNewWallComment(e.target.value)}
                    placeholder="Escribe una respuesta o comentario..."
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateWallComment(post.id)
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreateWallComment(post.id)}
                    disabled={!newWallComment.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}

            {wallPosts.length === 0 && (
              <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white">No hay publicaciones en el muro</h4>
                <p className="text-xs text-slate-400">
                  Los anuncios y temas de debate de tu profesor aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUIZ PRACTICE MODAL */}
      <Dialog
        open={isPracticeModalOpen}
        onOpenChange={setIsPracticeModalOpen}
        title={currentHomework?.title || 'Práctica de Cuestionario'}
        className="max-w-2xl"
      >
        {currentExercise ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>
                Pregunta {currentExIndex + 1} de {lessonExercises.length}
              </span>
              <span className="text-indigo-400">Puntos acumulados: {earnedPoints}</span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="font-display font-extrabold text-lg sm:text-xl text-white leading-relaxed">
                <MarkdownText content={currentExercise.prompt} />
              </div>
            </div>

            <AnswerControls
              exerciseType={currentExercise.type}
              options={
                Array.isArray(currentExercise.optionsJson)
                  ? currentExercise.optionsJson
                  : currentExercise.optionsJson
                    ? (() => {
                        try {
                          return JSON.parse(currentExercise.optionsJson)
                        } catch {
                          return []
                        }
                      })()
                    : []
              }
              hasSubmitted={feedback !== null}
              onSubmit={(val) => {
                setSelectedOption(val)
                handleSubmitPracticeAnswer()
              }}
              disabled={feedback !== null}
            />

            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-center space-y-2 ${
                  feedback.isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="font-bold text-base flex items-center justify-center gap-2">
                  {feedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>¡Respuesta Correcta! (+{currentExercise.points * 100} pts)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                      <span>Respuesta Incorrecta</span>
                    </>
                  )}
                </div>
                {feedback.explanation && (
                  <div className="text-xs italic text-slate-300">
                    <MarkdownText content={feedback.explanation} />
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="primary" size="md" onClick={handleNextExercise} className="gap-2 mx-auto">
                    <span>
                      {currentExIndex + 1 < lessonExercises.length
                        ? 'Siguiente Pregunta'
                        : 'Finalizar Cuestionario'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">Cargando ejercicios...</div>
        )}
      </Dialog>

      {/* MULTIMEDIA READING & PDF VIEWER MODAL */}
      <ReadingViewerModal
        open={isReadingModalOpen}
        onOpenChange={setIsReadingModalOpen}
        lesson={readingLesson}
        homework={readingHomework}
        onConfirmReading={handleConfirmReading}
      />

      {/* 1v1 BATTLES ARENA MODAL */}
      <BattlesModal
        open={isBattlesModalOpen}
        onOpenChange={setIsBattlesModalOpen}
        studentName={user?.displayName || 'Estudiante'}
        lessons={classLessons}
      />
    </div>
  )
}
