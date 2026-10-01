import { MotionConfig } from 'motion/react'
import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppHeader } from './components/navbar/AppHeader'
import { AsyncState } from './components/ui/AsyncState'
import { Feedback } from './components/ui/Feedback'
import { AuthProvider, useAuth } from './context/AuthContext'
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Forum = lazy(() => import('./pages/Forum').then((module) => ({ default: module.Forum })))
const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const HostRoom = lazy(() => import('./pages/HostRoom').then((module) => ({ default: module.HostRoom })))
const JoinGame = lazy(() => import('./pages/JoinGame').then((module) => ({ default: module.JoinGame })))
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
const PlayerRoom = lazy(() => import('./pages/PlayerRoom').then((module) => ({ default: module.PlayerRoom })))
const Presentation = lazy(() =>
  import('./pages/Presentation').then((module) => ({ default: module.Presentation }))
)
const StudentDashboard = lazy(() =>
  import('./pages/StudentDashboard').then((module) => ({ default: module.StudentDashboard }))
)

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: ('teacher' | 'student' | 'webmaster')[]
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <div className="min-h-screen bg-canvas text-foreground flex flex-col font-sans selection:bg-indigo-500 selection:text-foreground">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:p-4 focus:bg-surface focus:text-accent"
            >
              Ir al contenido
            </a>
            <AppHeader />
            <Feedback />
            <main className="flex-1 flex flex-col" id="main-content" tabIndex={-1}>
              <Suspense
                fallback={
                  <div className="p-4">
                    <AsyncState loading />
                  </div>
                }
              >
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/join" element={<JoinGame />} />
                  <Route path="/play/:pin" element={<PlayerRoom />} />

                  {/* Datashow Projection Room */}
                  <Route
                    path="/host/:sessionId"
                    element={
                      <ProtectedRoute roles={['teacher', 'webmaster']}>
                        <HostRoom />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/present/:classId/:lessonId"
                    element={
                      <ProtectedRoute roles={['teacher', 'webmaster']}>
                        <Presentation />
                      </ProtectedRoute>
                    }
                  />

                  {/* Teacher Dashboard */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute roles={['teacher', 'webmaster']}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student Portal */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute roles={['student', 'teacher', 'webmaster']}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Forum Community */}
                  <Route
                    path="/forum"
                    element={
                      <ProtectedRoute roles={['teacher', 'webmaster']}>
                        <Forum />
                      </ProtectedRoute>
                    }
                  />

                  {/* Webmaster Admin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={['webmaster']}>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </MotionConfig>
      </AuthProvider>
    </BrowserRouter>
  )
}
export default App
