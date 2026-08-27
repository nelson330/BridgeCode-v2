import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppHeader } from './components/navbar/AppHeader'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { Forum } from './pages/Forum'
import { Home } from './pages/Home'
import { HostRoom } from './pages/HostRoom'
import { JoinGame } from './pages/JoinGame'
import { Login } from './pages/Login'
import { PlayerRoom } from './pages/PlayerRoom'
import { StudentDashboard } from './pages/StudentDashboard'

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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
          <AppHeader />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/play/:pin" element={<PlayerRoom />} />

              {/* Datashow Projection Room */}
              <Route path="/host/:sessionId" element={<HostRoom />} />

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
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
export default App
