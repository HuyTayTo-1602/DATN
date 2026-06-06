import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Spinner from './components/Spinner'

import HomePage from './pages/HomePage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import PostJobPage from './pages/PostJobPage'
import MyJobsPage from './pages/MyJobsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/admin/AdminPage'
import MyCompaniesPage from './pages/MyCompaniesPage'
import JobApplicantsPage from './pages/JobApplicantsPage'
import CandidateListPage from './pages/recruiter/CandidateListPage'
import ChatPage from './pages/ChatPage'
import NotificationPage from './pages/NotificationPage'

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner text="Đang khởi động..." />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Job Seeker */}
        <Route
          path="/profile"
          element={
            <RequireAuth role="job_seeker">
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-applications"
          element={
            <RequireAuth role="job_seeker">
              <MyApplicationsPage />
            </RequireAuth>
          }
        />

        {/* Recruiter */}
        <Route
          path="/my-companies"
          element={
            <RequireAuth role="recruiter">
              <MyCompaniesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-jobs"
          element={
            <RequireAuth role="recruiter">
              <MyJobsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-jobs/:jobId/applicants"
          element={
            <RequireAuth role="recruiter">
              <JobApplicantsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/post-job"
          element={
            <RequireAuth role="recruiter">
              <PostJobPage />
            </RequireAuth>
          }
        />
        <Route
          path="/candidates/search"
          element={
            <RequireAuth role="recruiter">
              <CandidateListPage />
            </RequireAuth>
          }
        />

        {/* Chatbot AI — recruiter + job_seeker */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationPage />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminPage />
            </RequireAuth>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        background: '#1e293b',
        color: '#94a3b8',
        textAlign: 'center',
        padding: '24px 20px',
        fontSize: '0.85rem',
      }}>
        <div>© 2024 JobCV – Hệ thống tuyển dụng trực tuyến</div>
        <div style={{ marginTop: 4, fontSize: '0.78rem', opacity: .7 }}>
          Đồ án tốt nghiệp · Powered by FastAPI + React
        </div>
      </footer>
    </div>
  )
}
