import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminUsersTab from './AdminUsersTab'
import AdminCompaniesTab from './AdminCompaniesTab'
import AdminJobsTab from './AdminJobsTab'

const TABS = [
  { id: 'users',     label: 'Người dùng', icon: '👥' },
  { id: 'companies', label: 'Công ty',    icon: '🏢' },
  { id: 'jobs',      label: 'Việc làm',   icon: '💼' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho quản trị viên.
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="container">
          {/* Breadcrumb — static UI */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {['Dashboard', 'Quản trị', TABS.find(t => t.id === activeTab)?.label].map((crumb, i, arr) => (
              <span key={crumb} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: '0.78rem',
                  color: i === arr.length - 1 ? 'var(--primary-light)' : 'rgba(255,255,255,.45)',
                  fontWeight: i === arr.length - 1 ? 600 : 400,
                }}>
                  {crumb}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.25)' }}>›</span>
                )}
              </span>
            ))}
          </nav>

          <h1 style={{ marginBottom: 4 }}>Bảng quản trị</h1>
          <p>Quản lý người dùng, công ty và tin tuyển dụng trên hệ thống</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 24 }}>
        {/* Tab navigation */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--border)',
          marginBottom: 28,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '11px 22px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1,
                  fontWeight: active ? 700 : 400,
                  fontSize: '0.9rem',
                  color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                  transition: 'color .15s',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                {tab.label}
                {/* Active indicator dot */}
                {active && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--primary)', display: 'inline-block',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'users'     && <AdminUsersTab />}
        {activeTab === 'companies' && <AdminCompaniesTab />}
        {activeTab === 'jobs'      && <AdminJobsTab />}
      </div>
    </div>
  )
}
