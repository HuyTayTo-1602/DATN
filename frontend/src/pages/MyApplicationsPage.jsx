import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { applicationsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

const statusLabel = {
  pending: 'Chờ xem xét',
  reviewed: 'Đã xem xét',
  accepted: 'Chấp nhận',
  rejected: 'Từ chối',
}

export default function MyApplicationsPage() {
  const { user } = useAuth()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    applicationsApi.mine()
      .then(setApps)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (!user || user.role !== 'job_seeker') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho ứng viên.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="container flex justify-between items-center">
          <div>
            <h1>Đơn ứng tuyển của tôi</h1>
            <p>Theo dõi trạng thái các đơn đã nộp</p>
          </div>
          <Link to="/jobs" className="btn btn-primary">
            🔍 Tìm việc làm thêm
          </Link>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 28 }}>
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <Spinner />
        ) : apps.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <h3>Chưa có đơn ứng tuyển nào</h3>
            <p>Hãy tìm kiếm và ứng tuyển các vị trí phù hợp với bạn</p>
            <Link to="/jobs" className="btn btn-primary mt-4" style={{ display: 'inline-flex', marginTop: 16 }}>
              Tìm việc làm
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vị trí</th>
                  <th>Công ty</th>
                  <th>Trạng thái</th>
                  <th>Ngày nộp</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => (
                  <tr key={app.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{app.job_title || `Job #${app.job_id}`}</td>
                    <td>{app.company_name || '—'}</td>
                    <td>
                      <span className={`status-badge status-${app.status}`}>
                        {statusLabel[app.status] || app.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {app.created_at
                        ? new Date(app.created_at).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td>
                      <Link
                        to={`/jobs/${app.job_id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Xem job
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
