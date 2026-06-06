import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { adminApi } from '../../services/api'
import StatCard from '../../components/admin/StatCard'
import AdminChartPanel from '../../components/admin/AdminChartPanel'
import TrendChart from '../../components/admin/TrendChart'
import AttentionWidget from '../../components/admin/AttentionWidget'
import AdminUsersTab from './AdminUsersTab'
import AdminCompaniesTab from './AdminCompaniesTab'
import AdminJobsTab from './AdminJobsTab'

const TABS = [
  { id: 'dashboard', label: 'Tổng quan',  icon: '📊' },
  { id: 'users',     label: 'Người dùng', icon: '👥' },
  { id: 'companies', label: 'Công ty',    icon: '🏢' },
  { id: 'jobs',      label: 'Việc làm',   icon: '💼' },
]

const PERIODS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d',    label: '7 ngày qua' },
  { value: '30d',   label: '30 ngày qua' },
]

const PERIOD_LABEL = { today: 'hôm nay', '7d': 'trong 7 ngày', '30d': 'trong 30 ngày' }

const CARD = {
  background: 'var(--bg-card, #1a2236)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
}

// ── CV Parse progress bars ───────────────────────────────────────────────────

function CVParsePanel({ stats }) {
  const { total = 0, success = 0, failed = 0, pending: pend = 0 } = stats ?? {}
  const hasFail = failed > 0

  if (!total) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        📂 Chưa có CV nào được upload
      </div>
    )
  }

  const bars = [
    { label: 'Thành công', value: success, color: '#4ade80', bg: '#4ade8015' },
    { label: 'Thất bại',   value: failed,  color: hasFail ? '#f87171' : '#6b7280', bg: hasFail ? '#f8717115' : 'transparent' },
    { label: 'Đang chờ',   value: pend,    color: '#fbbf24', bg: '#fbbf2415' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng số CV</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f4ff' }}>{total.toLocaleString()}</span>
      </div>

      {bars.map(({ label, value, color, bg }) => {
        const pct = total ? Math.round((value / total) * 100) : 0
        return (
          <div key={label} style={{ background: bg, borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>
                {value} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 3, transition: 'width .5s',
                minWidth: pct > 0 ? 3 : 0,
              }} />
            </div>
          </div>
        )
      })}

      {hasFail && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
          padding: '8px 12px', borderRadius: 8,
          background: '#ef444415', border: '1px solid #ef444430',
        }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.78rem', color: '#f87171' }}>
            {failed} CV parse thất bại — cần kiểm tra lại
          </span>
        </div>
      )}
    </div>
  )
}

// ── Top companies table ──────────────────────────────────────────────────────

function TopCompaniesPanel({ companies }) {
  if (!companies || companies.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        🏢 Chưa có công ty nào đăng tin
      </div>
    )
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {['#', 'Công ty', 'Tin đăng'].map((h, i) => (
            <th key={h} style={{
              textAlign: i === 2 ? 'right' : 'left',
              padding: '6px 8px',
              color: 'var(--text-muted)', fontWeight: 600,
              fontSize: '0.76rem', letterSpacing: '0.04em',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {companies.map((c, i) => (
          <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <td style={{ padding: '8px 8px', color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
            <td style={{ padding: '8px 8px', color: '#d1d9f0', fontWeight: 500 }}>{c.name}</td>
            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary-light, #818cf8)' }}>
              {c.job_count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ onNavigate }) {
  const [period, setPeriod]     = useState('30d')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchData = useCallback((p) => {
    setLoading(true)
    setError(null)
    adminApi.getDashboardSummary(p)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData(period) }, [period, fetchData])

  const periodLabel = PERIOD_LABEL[period] ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Time filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          display: 'flex', gap: 0,
          border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        }}>
          {PERIODS.map(({ value, label }) => {
            const active = period === value
            return (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                disabled={loading}
                style={{
                  padding: '7px 16px', fontSize: '0.8rem', fontWeight: active ? 700 : 400,
                  background: active ? 'var(--primary, #6366f1)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: loading ? 'default' : 'pointer',
                  borderRight: value !== '30d' ? '1px solid var(--border)' : 'none',
                  transition: 'background .15s, color .15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: '#ef444415', border: '1px solid #ef444430',
          color: '#f87171', fontSize: '0.84rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading overlay or content */}
      {loading && !data ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu...
        </div>
      ) : data ? (
        <>
          {/* ── Stat cards 2×3 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <StatCard
              label="Tổng người dùng"
              value={data.totals.users}
              icon="👤" color="#6366f1"
              newCount={data.period_stats.new_users}
              periodLabel={periodLabel}
              changePct={data.period_stats.change_users_pct}
            />
            <StatCard
              label="Ứng viên"
              value={data.totals.candidates}
              icon="🎓" color="#3b82f6"
              newCount={null}
            />
            <StatCard
              label="Nhà tuyển dụng"
              value={data.totals.recruiters}
              icon="🏷️" color="#f59e0b"
              newCount={null}
            />
            <StatCard
              label="Công ty"
              value={data.totals.companies}
              icon="🏢" color="#10b981"
              newCount={data.period_stats.new_companies}
              periodLabel={periodLabel}
              changePct={data.period_stats.change_companies_pct}
            />
            <StatCard
              label="Tin tuyển dụng"
              value={data.totals.jobs}
              icon="💼" color="#8b5cf6"
              newCount={data.period_stats.new_jobs}
              periodLabel={periodLabel}
              changePct={data.period_stats.change_jobs_pct}
            />
            <StatCard
              label="Đơn ứng tuyển"
              value={data.totals.applications}
              icon="📄" color="#ef4444"
              newCount={data.period_stats.new_applications}
              periodLabel={periodLabel}
              changePct={data.period_stats.change_applications_pct}
            />
          </div>

          {/* ── Trend chart ── */}
          <div style={CARD}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.88rem', color: '#f0f4ff' }}>
              Xu hướng 8 tuần gần nhất
            </div>
            <TrendChart data={data.weekly_trend} />
          </div>

          {/* ── Status charts ── */}
          <AdminChartPanel
            jobsByStatus={data.jobs_by_status}
            applicationsByStatus={data.applications_by_status}
          />

          {/* ── Attention + CV parse ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <AttentionWidget attention={data.attention} onNavigate={onNavigate} />

            <div style={CARD}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.88rem', color: '#f0f4ff' }}>
                CV Upload &amp; Parse
              </div>
              <CVParsePanel stats={data.cv_parse_stats} />
            </div>
          </div>

          {/* ── Top companies ── */}
          <div style={CARD}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.88rem', color: '#f0f4ff' }}>
              Top 5 công ty theo số tin đăng
            </div>
            <TopCompaniesPanel companies={data.top_companies} />
          </div>
        </>
      ) : null}
    </div>
  )
}

// ── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho quản trị viên.
        </div>
      </div>
    )
  }

  // Allow attention widget to navigate to specific tab
  const handleNavigate = (tab) => setActiveTab(tab)

  return (
    <div>
      <div className="page-header">
        <div className="container">
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

        {activeTab === 'dashboard' && <DashboardTab onNavigate={handleNavigate} />}
        {activeTab === 'users'     && <AdminUsersTab />}
        {activeTab === 'companies' && <AdminCompaniesTab />}
        {activeTab === 'jobs'      && <AdminJobsTab />}
      </div>
    </div>
  )
}
