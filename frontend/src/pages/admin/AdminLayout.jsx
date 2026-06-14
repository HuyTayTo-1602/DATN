import { NavLink, Outlet } from 'react-router-dom'
import Icon from '../../components/Icon'
import Navbar from '../../components/Navbar'

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: 'dashboard', end: true },
  { to: '/admin/users', label: 'Người dùng', icon: 'users' },
  { to: '/admin/companies', label: 'Công ty', icon: 'building' },
  { to: '/admin/jobs', label: 'Việc làm', icon: 'briefcase' },
]

const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="side-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
                <Icon name={item.icon} size={16} />{item.label}
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
