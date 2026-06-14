import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage from './pages/HomePage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

import ProfilePage from './pages/ProfilePage'
import MyCvsPage from './pages/MyCvsPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import RecommendationsPage from './pages/RecommendationsPage'
import NotificationsPage from './pages/NotificationsPage'
import ChatbotPage from './pages/ChatbotPage'

import RecruiterCompaniesPage from './pages/recruiter/RecruiterCompaniesPage'
import RecruiterJobsPage from './pages/recruiter/RecruiterJobsPage'
import JobApplicantsPage from './pages/recruiter/JobApplicantsPage'
import CandidateSearchPage from './pages/recruiter/CandidateSearchPage'

import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'
import AdminJobsPage from './pages/admin/AdminJobsPage'
import AdminLayout from './pages/admin/AdminLayout'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/jobs" element={<PublicLayout><JobsPage /></PublicLayout>} />
          <Route path="/jobs/:id" element={<PublicLayout><JobDetailPage /></PublicLayout>} />
          <Route path="/companies" element={<PublicLayout><CompaniesPage /></PublicLayout>} />
          <Route path="/companies/:id" element={<PublicLayout><CompanyDetailPage /></PublicLayout>} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* job_seeker */}
          <Route path="/profile" element={<PublicLayout><ProtectedRoute roles={['job_seeker']}><ProfilePage /></ProtectedRoute></PublicLayout>} />
          <Route path="/my-cvs" element={<PublicLayout><ProtectedRoute roles={['job_seeker']}><MyCvsPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/my-applications" element={<PublicLayout><ProtectedRoute roles={['job_seeker']}><MyApplicationsPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/recommendations" element={<PublicLayout><ProtectedRoute roles={['job_seeker']}><RecommendationsPage /></ProtectedRoute></PublicLayout>} />

          {/* shared authenticated */}
          <Route path="/notifications" element={<PublicLayout><ProtectedRoute><NotificationsPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/chatbot" element={<PublicLayout><ProtectedRoute roles={['job_seeker', 'recruiter']}><ChatbotPage /></ProtectedRoute></PublicLayout>} />

          {/* recruiter */}
          <Route path="/recruiter/dashboard" element={<Navigate to="/recruiter/jobs" replace />} />
          <Route path="/recruiter/companies" element={<PublicLayout><ProtectedRoute roles={['recruiter']}><RecruiterCompaniesPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/recruiter/jobs" element={<PublicLayout><ProtectedRoute roles={['recruiter']}><RecruiterJobsPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/recruiter/jobs/:id/applicants" element={<PublicLayout><ProtectedRoute roles={['recruiter']}><JobApplicantsPage /></ProtectedRoute></PublicLayout>} />
          <Route path="/recruiter/candidates" element={<PublicLayout><ProtectedRoute roles={['recruiter']}><CandidateSearchPage /></ProtectedRoute></PublicLayout>} />

          {/* admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="jobs" element={<AdminJobsPage />} />
          </Route>

          <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
