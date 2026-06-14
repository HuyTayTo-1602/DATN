import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import { StatusBadge } from '../components/Badges'
import { Spinner } from '../components/Spinner'
import { applicationsApi } from '../services/api'
import { formatDateVN } from '../utils/format'

const FILTERS = [
  ['all', 'Tất cả'],
  ['pending', 'Chờ xét'],
  ['accepted', 'Đồng ý'],
  ['rejected', 'Từ chối'],
]

const MyApplicationsPage = () => {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true
    applicationsApi.mine()
      .then((data) => { if (active) setApps(Array.isArray(data) ? data : (data?.items || [])) })
      .catch(() => { if (active) setApps([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const counts = useMemo(() => ({
    all: apps.length,
    pending: apps.filter((a) => a.status === 'pending').length,
    accepted: apps.filter((a) => a.status === 'accepted').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  }), [apps])

  const list = filter === 'all' ? apps : apps.filter((a) => a.status === filter)

  if (loading) {
    return (
      <div className="container" style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head">
        <div>
          <h1>Đơn ứng tuyển của tôi</h1>
          <p className="text-secondary mb-0">Theo dõi trạng thái các đơn đã nộp</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/jobs')}><Icon name="search" size={14} />Tìm việc làm thêm</button>
      </div>

      <div className="chip-row">
        {FILTERS.map(([k, l]) => (
          <span key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            {l} <span className="chip-count">{counts[k]}</span>
          </span>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Chưa có đơn ứng tuyển nào"
          description="Bắt đầu khám phá hàng nghìn cơ hội đang chờ bạn."
          action={<button className="btn btn-primary" onClick={() => navigate('/jobs')}>Tìm việc ngay <Icon name="arrow-right" size={14} /></button>}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Vị trí</th>
                <th>Công ty</th>
                <th style={{ width: 180 }}>Trạng thái</th>
                <th style={{ width: 140 }}>Ngày nộp</th>
                <th style={{ width: 140, textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.map((app, idx) => (
                <tr key={app.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td><div style={{ fontWeight: 600 }}>{app.job_title || `Công việc #${app.job_id}`}</div></td>
                  <td><span className="text-sm">{app.company_name || '—'}</span></td>
                  <td><StatusBadge status={app.status} /></td>
                  <td className="text-sm">{formatDateVN(app.created_at)}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/jobs/${app.job_id}`)}><Icon name="eye" size={12} />Xem job</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MyApplicationsPage
