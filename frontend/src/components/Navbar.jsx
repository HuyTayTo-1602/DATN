import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { Avatar } from './Avatar'
import { useAuth } from '../context/AuthContext'
import { notificationsApi } from '../services/api'
import { LABEL, timeAgo } from '../utils/format'

const Navbar = () => {
  const { user, role, roleLabel, isAuthenticated, unreadCount, setUnreadCount, latestNotification, logout } = useAuth()
  const [openNotif, setOpenNotif] = useState(false)
  const [openAvatar, setOpenAvatar] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  const notifRef = useRef(null)
  const avatarRef = useRef(null)
  const manageRef = useRef(null)
  const adminRef = useRef(null)
  const [openManage, setOpenManage] = useState(false)
  const [openAdmin, setOpenAdmin] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setOpenAvatar(false)
      if (manageRef.current && !manageRef.current.contains(e.target)) setOpenManage(false)
      if (adminRef.current && !adminRef.current.contains(e.target)) setOpenAdmin(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // refresh notification list when a realtime message arrives
  useEffect(() => {
    if (latestNotification && openNotif) loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestNotification])

  const loadNotifications = async () => {
    setLoadingNotif(true)
    try {
      const data = await notificationsApi.list(5, 0)
      setNotifications(data || [])
    } catch {
      // ignore
    } finally {
      setLoadingNotif(false)
    }
  }

  const toggleNotif = () => {
    setOpenNotif((v) => {
      const next = !v
      if (next) loadNotifications()
      return next
    })
  }

  const markAllRead = async (e) => {
    e.stopPropagation()
    try {
      await notificationsApi.markAllRead()
      setUnreadCount(0)
      setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  const clickNotification = async (n) => {
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id)
        setUnreadCount((c) => Math.max(0, c - 1))
        setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      } catch {
        // ignore
      }
    }
    setOpenNotif(false)
    if (n.related_type === 'job_application') {
      if (role === 'recruiter' && n.related_id) {
        navigate(`/recruiter/jobs/${n.related_id}/applicants`)
      } else {
        navigate('/my-applications')
      }
    } else if (n.related_type === 'job' && n.related_id) {
      navigate(`/jobs/${n.related_id}`)
    } else {
      navigate('/notifications')
    }
  }

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  const doLogout = () => {
    logout()
    setOpenAvatar(false)
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark">CB</span>
          CareerBridge
        </Link>
        <div className="nav-links">
          <Link to="/jobs" className={`nav-link ${isActive('/jobs') ? 'active' : ''}`}>Tìm việc</Link>
          <Link to="/companies" className={`nav-link ${isActive('/companies') ? 'active' : ''}`}>Công ty</Link>
          {role === 'job_seeker' && (
            <Link to="/recommendations" className={`nav-link ${isActive('/recommendations') ? 'active' : ''}`}>Việc phù hợp</Link>
          )}
          {role === 'job_seeker' && (
            <div className="dropdown" ref={manageRef} style={{ position: 'relative' }}>
              <button
                className={`nav-link ${isActive('/profile') || isActive('/my-cvs') || isActive('/my-applications') ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setOpenManage((v) => !v)}
              >
                Quản lý <Icon name="chevron-down" size={13} />
              </button>
              {openManage && (
                <div className="dropdown-menu" style={{ top: '100%', left: 0, minWidth: 240 }}>
                  <Link to="/profile" className="dropdown-item" onClick={() => setOpenManage(false)}>
                    <Icon name="user" size={16} />Quản lý hồ sơ cá nhân
                  </Link>
                  <Link to="/my-cvs" className="dropdown-item" onClick={() => setOpenManage(false)}>
                    <Icon name="cv" size={16} />Quản lý CV
                  </Link>
                  <Link to="/my-applications" className="dropdown-item" onClick={() => setOpenManage(false)}>
                    <Icon name="inbox" size={16} />Quản lý đơn ứng tuyển
                  </Link>
                </div>
              )}
            </div>
          )}
          {role === 'recruiter' && (
            <Link to="/recruiter/candidates" className={`nav-link ${isActive('/recruiter/candidates') ? 'active' : ''}`}>Ứng viên</Link>
          )}
          {role === 'recruiter' && (
            <div className="dropdown" ref={manageRef} style={{ position: 'relative' }}>
              <button
                className={`nav-link ${pathname.startsWith('/recruiter') && !pathname.startsWith('/recruiter/candidates') ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setOpenManage((v) => !v)}
              >
                Quản lý <Icon name="chevron-down" size={13} />
              </button>
              {openManage && (
                <div className="dropdown-menu" style={{ top: '100%', left: 0, minWidth: 240 }}>
                  <Link to="/recruiter/companies" className="dropdown-item" onClick={() => setOpenManage(false)}>
                    <Icon name="building" size={16} />Quản lý thông tin công ty
                  </Link>
                  <Link to="/recruiter/jobs" className="dropdown-item" onClick={() => setOpenManage(false)}>
                    <Icon name="briefcase" size={16} />Quản lý tin tuyển dụng
                  </Link>
                </div>
              )}
            </div>
          )}
          {(role === 'job_seeker' || role === 'recruiter') && (
            <Link to="/chatbot" className={`nav-link ${isActive('/chatbot') ? 'active' : ''}`}>
              <Icon name="sparkles" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Trợ lý AI
            </Link>
          )}
          {role === 'admin' && (
            <div className="dropdown" ref={adminRef} style={{ position: 'relative' }}>
              <button
                className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setOpenAdmin((v) => !v)}
              >
                Quản trị <Icon name="chevron-down" size={13} />
              </button>
              {openAdmin && (
                <div className="dropdown-menu" style={{ top: '100%', left: 0, minWidth: 200 }}>
                  <Link to="/admin" className="dropdown-item" onClick={() => setOpenAdmin(false)}>
                    <Icon name="dashboard" size={16} />Tổng quan
                  </Link>
                  <Link to="/admin/users" className="dropdown-item" onClick={() => setOpenAdmin(false)}>
                    <Icon name="user" size={16} />Người dùng
                  </Link>
                  <Link to="/admin/companies" className="dropdown-item" onClick={() => setOpenAdmin(false)}>
                    <Icon name="building" size={16} />Công ty
                  </Link>
                  <Link to="/admin/jobs" className="dropdown-item" onClick={() => setOpenAdmin(false)}>
                    <Icon name="briefcase" size={16} />Việc làm
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="nav-right">
          {!isAuthenticated ? (
            <>
              <button className="btn btn-outline" onClick={() => navigate('/login')}>Đăng nhập</button>
              <button className="btn btn-primary" onClick={() => navigate('/register')}>Đăng ký</button>
            </>
          ) : (
            <>
              <div className="dropdown" ref={notifRef}>
                <button className="icon-btn" onClick={toggleNotif} aria-label="Thông báo">
                  <Icon name="bell" size={20} />
                  {unreadCount > 0 && <span className="ping">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                {openNotif && (
                  <div className="dropdown-menu notif-panel">
                    <div className="notif-header">
                      <strong style={{ fontSize: 'var(--text-sm)' }}>Thông báo</strong>
                      <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
                    </div>
                    <div className="notif-list">
                      {loadingNotif && <div style={{ padding: 16, textAlign: 'center' }}><span className="text-muted text-sm">Đang tải…</span></div>}
                      {!loadingNotif && notifications.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center' }}><span className="text-muted text-sm">Không có thông báo</span></div>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => clickNotification(n)}>
                          <div className="notif-icon">
                            <Icon name={n.type?.includes('accepted') ? 'check' : n.type?.includes('submitted') ? 'user' : n.type === 'job_invitation' ? 'briefcase' : n.type?.includes('match') ? 'sparkles' : 'info'} size={16} />
                          </div>
                          <div className="notif-body">
                            <div className="notif-title">{n.title || LABEL[n.type] || 'Thông báo'}</div>
                            <div className="notif-msg">{n.message}</div>
                            <div className="notif-time">{timeAgo(n.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="dropdown" ref={avatarRef}>
                <button className="icon-btn" onClick={() => setOpenAvatar((v) => !v)} style={{ width: 'auto', padding: '0 6px', gap: 6, display: 'flex' }}>
                  <Avatar name={user?.email} size="sm" />
                  <Icon name="chevron-down" size={14} />
                </button>
                {openAvatar && (
                  <div className="dropdown-menu">
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{roleLabel}</div>
                    </div>
                    <div className="dropdown-divider" />
                    {role === 'job_seeker' && (
                      <>
                        <Link to="/profile" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="user" size={16} />Hồ sơ cá nhân</Link>
                        <Link to="/my-cvs" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="cv" size={16} />Quản lý CV</Link>
                        <Link to="/my-applications" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="inbox" size={16} />Đơn ứng tuyển</Link>
                      </>
                    )}
                    {role === 'recruiter' && (
                      <>
                        <Link to="/recruiter/companies" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="building" size={16} />Công ty của tôi</Link>
                        <Link to="/recruiter/jobs" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="briefcase" size={16} />Tin tuyển dụng</Link>
                      </>
                    )}
                    {role === 'admin' && (
                      <Link to="/admin" className="dropdown-item" onClick={() => setOpenAvatar(false)}><Icon name="dashboard" size={16} />Trang quản trị</Link>
                    )}
                    <div className="dropdown-divider" />
                    <div className="dropdown-item" onClick={doLogout}><Icon name="logout" size={16} />Đăng xuất</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
