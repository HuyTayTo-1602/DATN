import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { Spinner } from '../../components/Spinner'
import { adminApi } from '../../services/api'

const PERIODS = [
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['30d', '30 ngày'],
]

const KPI_DEFS = [
  { key: 'users', label: 'Tổng người dùng', icon: 'users', bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  { key: 'candidates', label: 'Ứng viên', icon: 'user', bg: 'var(--color-accent-light)', fg: 'var(--color-accent)' },
  { key: 'recruiters', label: 'Nhà tuyển dụng', icon: 'briefcase', bg: 'var(--color-info-light)', fg: 'var(--color-info)' },
  { key: 'companies', label: 'Công ty', icon: 'building', bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
  { key: 'jobs', label: 'Việc làm', icon: 'briefcase', bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' },
  { key: 'applications', label: 'Lượt ứng tuyển', icon: 'inbox', bg: '#EEE4F7', fg: '#7849B8' },
]

const fmt = (n) => (n ?? 0).toLocaleString('vi-VN')

const AdminDashboardPage = () => {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    adminApi.getDashboardSummary(period)
      .then((d) => { if (active) setData(d) })
      .catch(() => { if (active) setData(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  if (loading && !data) {
    return (
      <div style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  const totals = data?.totals
  const ps = data?.period_stats
  const jbs = data?.jobs_by_status
  const abs_ = data?.applications_by_status
  const totalJobs = (jbs?.active || 0) + (jbs?.closed || 0)
  const totalApps = (abs_?.pending || 0) + (abs_?.accepted || 0) + (abs_?.rejected || 0)
  const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  const cv = data?.cv_parse_stats
  const cvSuccessPct = cv?.total ? Math.round((cv.success / cv.total) * 1000) / 10 : 0
  const deltas = ps ? [
    { label: 'Người dùng mới', num: ps.new_users, delta: ps.change_users_pct },
    { label: 'Việc làm mới', num: ps.new_jobs, delta: ps.change_jobs_pct },
    { label: 'Lượt ứng tuyển', num: ps.new_applications, delta: ps.change_applications_pct },
    { label: 'Công ty mới', num: ps.new_companies, delta: ps.change_companies_pct },
  ] : []

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="crumbs">Trang quản trị</div>
          <h1>Tổng quan hệ thống</h1>
        </div>
        <div className="row gap-sm">
          {PERIODS.map(([k, l]) => (
            <button key={k} className={`chip ${period === k ? 'active' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 16 }}>
        {KPI_DEFS.map((k) => (
          <div className="kpi" key={k.key}>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, color: k.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={k.icon} size={16} />
              </div>
              <span className="kpi-label" style={{ margin: 0 }}>{k.label}</span>
            </div>
            <div className="kpi-num">{fmt(totals?.[k.key])}</div>
          </div>
        ))}
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {deltas.map((d, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{d.label} · {period === 'today' ? 'hôm nay' : period}</div>
            <div className="kpi-num">{fmt(d.num)}</div>
            {d.delta != null && (
              <span className={`kpi-delta ${d.delta >= 0 ? 'up' : 'down'}`}>
                <Icon name={d.delta >= 0 ? 'arrow-up' : 'arrow-down'} size={11} />{Math.abs(d.delta)}% so với kỳ trước
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Xu hướng theo tuần</h3>
            <div className="legend">
              <span><span className="legend-dot" style={{ background: 'var(--color-primary)' }} />Việc làm mới</span>
              <span><span className="legend-dot" style={{ background: 'var(--color-accent)' }} />Lượt ứng tuyển</span>
            </div>
          </div>
          <div className="bar-chart" style={{ height: 260 }}>
            {(data?.weekly_trend || []).map((w, i) => {
              const maxVal = Math.max(1, ...(data.weekly_trend.map((x) => Math.max(x.new_jobs, x.new_applications))))
              return (
                <div className="bar-col" key={i}>
                  <div className="bar-stack" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    <div className="bar" style={{ height: `${(w.new_jobs / maxVal) * 220}px`, width: '45%' }} />
                    <div className="bar alt" style={{ height: `${(w.new_applications / maxVal) * 220}px`, width: '45%' }} />
                  </div>
                  <div className="bar-label">T{i + 1}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Việc làm theo trạng thái</h3></div>
          <div className="donut-wrap">
            <div className="donut" style={{ background: `conic-gradient(var(--color-success) 0 ${pct(jbs?.active, totalJobs)}%, var(--color-error) ${pct(jbs?.active, totalJobs)}% 100%)` }}>
              <div className="donut-center">
                <div className="big">{fmt(totalJobs)}</div>
                <div className="small">Tổng</div>
              </div>
            </div>
            <div className="donut-legend">
              <div className="donut-legend-item"><span className="sw" style={{ background: 'var(--color-success)' }} />Đang tuyển <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>{fmt(jbs?.active)} · {pct(jbs?.active, totalJobs)}%</span></div>
              <div className="donut-legend-item"><span className="sw" style={{ background: 'var(--color-error)' }} />Đã đóng <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>{fmt(jbs?.closed)} · {pct(jbs?.closed, totalJobs)}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-head"><h3>Ứng tuyển theo trạng thái</h3></div>
          <div className="donut-wrap">
            <div className="donut" style={{ background: `conic-gradient(var(--color-warning) 0 ${pct(abs_?.pending, totalApps)}%, var(--color-success) ${pct(abs_?.pending, totalApps)}% ${pct(abs_?.pending, totalApps) + pct(abs_?.accepted, totalApps)}%, var(--color-error) ${pct(abs_?.pending, totalApps) + pct(abs_?.accepted, totalApps)}% 100%)` }}>
              <div className="donut-center">
                <div className="big">{totalApps >= 1000 ? `${(totalApps / 1000).toFixed(1)}K` : fmt(totalApps)}</div>
                <div className="small">Đơn</div>
              </div>
            </div>
            <div className="donut-legend">
              <div className="donut-legend-item"><span className="sw" style={{ background: 'var(--color-warning)' }} />Chờ xét <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>{fmt(abs_?.pending)} · {pct(abs_?.pending, totalApps)}%</span></div>
              <div className="donut-legend-item"><span className="sw" style={{ background: 'var(--color-success)' }} />Được chọn <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>{fmt(abs_?.accepted)} · {pct(abs_?.accepted, totalApps)}%</span></div>
              <div className="donut-legend-item"><span className="sw" style={{ background: 'var(--color-error)' }} />Không được chọn <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>{fmt(abs_?.rejected)} · {pct(abs_?.rejected, totalApps)}%</span></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Top công ty</h3></div>
          <div className="col" style={{ gap: 12 }}>
            {(data?.top_companies || []).length === 0 && <div className="text-sm text-secondary">Chưa có dữ liệu</div>}
            {(data?.top_companies || []).map((c, i) => {
              const max = Math.max(1, ...data.top_companies.map((x) => x.job_count))
              return (
                <div className="row" key={c.id} style={{ gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? 'var(--color-primary-light)' : 'var(--color-surface-2)', color: i < 3 ? 'var(--color-primary)' : 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                  <div style={{ width: 160, background: 'var(--color-surface-2)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.job_count / max) * 100}%`, background: 'var(--color-primary)', borderRadius: 99 }} />
                  </div>
                  <div className="text-sm" style={{ fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{c.job_count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-head"><h3>Cần chú ý</h3></div>
          <div className="alert-list">
            <div className="alert-item" style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}><Icon name="warning" size={16} />{fmt(data?.attention?.overdue_applications)} đơn quá hạn xử lý (&gt; 14 ngày)</div>
            <div className="alert-item" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}><Icon name="info" size={16} />{fmt(data?.attention?.inactive_users)} người dùng không hoạt động trong 90 ngày</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Phân tích CV</h3></div>
          <div className="row" style={{ gap: 20, marginBottom: 18 }}>
            <div>
              <div className="kpi-label">Tổng</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{fmt(cv?.total)}</div>
            </div>
            <div>
              <div className="kpi-label" style={{ color: 'var(--color-success)' }}>Thành công</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}>{fmt(cv?.success)}</div>
            </div>
            <div>
              <div className="kpi-label" style={{ color: 'var(--color-error)' }}>Lỗi</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-error)' }}>{fmt(cv?.failed)}</div>
            </div>
            <div>
              <div className="kpi-label" style={{ color: 'var(--color-warning)' }}>Đang xử lý</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-warning)' }}>{fmt(cv?.pending)}</div>
            </div>
          </div>
          <div className="text-sm text-secondary" style={{ marginBottom: 6 }}>Tỉ lệ thành công</div>
          <div style={{ height: 10, background: 'var(--color-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cvSuccessPct}%`, background: 'var(--color-success)', borderRadius: 99 }} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            <span>0%</span><span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{cvSuccessPct}% thành công</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
