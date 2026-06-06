import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './notifications/NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleLabel = { job_seeker: 'Ứng viên', recruiter: 'Nhà tuyển dụng', admin: 'Admin' }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo">
          Job<span>CV</span>
        </NavLink>

        {/* Nav links */}
        <div className="navbar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Trang chủ
          </NavLink>
          <NavLink to="/jobs" className={({ isActive }) => isActive ? 'active' : ''}>
            Việc làm
          </NavLink>
          {user?.role === 'job_seeker' && (
            <>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                Hồ sơ
              </NavLink>
              <NavLink to="/my-applications" className={({ isActive }) => isActive ? 'active' : ''}>
                Đơn ứng tuyển
              </NavLink>
            </>
          )}
          {user?.role === 'recruiter' && (
            <>
              <NavLink to="/my-companies" className={({ isActive }) => isActive ? 'active' : ''}>
                Công ty
              </NavLink>
              <NavLink to="/my-jobs" className={({ isActive }) => isActive ? 'active' : ''}>
                Quản lý tin
              </NavLink>
              <NavLink to="/candidates/search" className={({ isActive }) => isActive ? 'active' : ''}>
                Tìm ứng viên
              </NavLink>
            </>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
              Quản trị
            </NavLink>
          )}
          {(user?.role === 'recruiter' || user?.role === 'job_seeker') && (
            <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
              AI Assistant
            </NavLink>
          )}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              <NotificationBell />
              <div className="user-badge">
                <span>👤 {user.email.split('@')[0]}</span>
                <span className="role-tag">{roleLabel[user.role] || user.role}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Đăng ký</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
