import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/lib/api'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CourseView = lazy(() => import('./pages/CourseView'))
const UnitView = lazy(() => import('./pages/UnitView'))
const CreateCourse = lazy(() => import('./pages/CreateCourse'))
const CreateUnit = lazy(() => import('./pages/CreateUnit'))
const CreateContent = lazy(() => import('./pages/CreateContent'))
const EditCourse = lazy(() => import('./pages/EditCourse'))
const EditUnit = lazy(() => import('./pages/EditUnit'))
const EditContent = lazy(() => import('./pages/EditContent'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    retry: false,
    staleTime: 60_000,
  })

  if (isLoading) {
    return <FullPageLoader />
  }

  return data ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute><CourseView /></ProtectedRoute>} />
          <Route path="/unit/:id" element={<ProtectedRoute><UnitView /></ProtectedRoute>} />
          <Route path="/create/course" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
          <Route path="/create/unit/:courseId" element={<ProtectedRoute><CreateUnit /></ProtectedRoute>} />
          <Route path="/create/content/:unitId" element={<ProtectedRoute><CreateContent /></ProtectedRoute>} />
          <Route path="/edit/course/:id" element={<ProtectedRoute><EditCourse /></ProtectedRoute>} />
          <Route path="/edit/unit/:id" element={<ProtectedRoute><EditUnit /></ProtectedRoute>} />
          <Route path="/edit/content/:id" element={<ProtectedRoute><EditContent /></ProtectedRoute>} />
          <Route path="/stats/:userId" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(248,250,252,0.9),_rgba(241,245,249,0.78))]">
      <div className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/60 shadow-soft">
        Loading...
      </div>
    </div>
  )
}

export default App
