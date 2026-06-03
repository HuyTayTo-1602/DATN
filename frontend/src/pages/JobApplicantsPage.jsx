import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { applicationsApi, jobsApi } from '../services/api'

async function openCv(appId, setLoadingCv) {
  setLoadingCv(appId)
  try {
    const blob = await applicationsApi.streamCv(appId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (err) {
    alert('Không thể mở CV: ' + err.message)
  } finally {
    setLoadingCv(null)
  }
}
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

const STATUS_CONFIG = {
  pending:  { label: 'Chờ xem xét', cls: 'badge-gray'   },
  reviewed: { label: 'Đã xem xét',  cls: 'badge-blue'   },
  accepted: { label: 'Đã chấp nhận', cls: 'badge-green' },
  rejected: { label: 'Đã từ chối',  cls: 'badge-orange' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}

export default function JobApplicantsPage() {
  const { jobId } = useParams()
  const { user } = useAuth()

  const [job, setJob] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [loadingCv, setLoadingCv] = useState(null)

  useEffect(() => {
    if (user?.role !== 'recruiter') return
    Promise.all([
      jobsApi.get(jobId),
      applicationsApi.forJob(jobId),
    ])
      .then(([jobData, apps]) => {
        setJob(jobData)
        setApplicants(apps)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [jobId, user])

  const handleStatus = async (appId, newStatus) => {
    setUpdating(appId)
    try {
      const updated = await applicationsApi.updateStatus(appId, newStatus)
      setApplicants((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a))
      )
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho nhà tuyển dụng.
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 480, margin: '0 auto' }}>{error}</div>
        <Link to="/my-jobs" className="btn btn-primary mt-4" style={{ display: 'inline-flex' }}>
          ← Quay lại quản lý tin
        </Link>
      </div>
    )
  }

  const counts = {
    total:    applicants.length,
    pending:  applicants.filter((a) => a.status === 'pending').length,
    reviewed: applicants.filter((a) => a.status === 'reviewed').length,
    accepted: applicants.filter((a) => a.status === 'accepted').length,
    rejected: applicants.filter((a) => a.status === 'rejected').length,
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <Link to="/my-jobs" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ← Quay lại quản lý tin
          </Link>
          <h1 style={{ marginTop: 8 }}>Danh sách ứng viên</h1>
          <p style={{ fontWeight: 500, color: 'var(--primary-light)' }}>
            {job?.title} — {job?.company?.name}
          </p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 24 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Tổng',         value: counts.total,    color: 'var(--text)' },
            { label: 'Chờ xem xét',  value: counts.pending,  color: 'var(--text-muted)' },
            { label: 'Đã xem xét',   value: counts.reviewed, color: 'var(--primary-light)' },
            { label: 'Chấp nhận',    value: counts.accepted, color: 'var(--success)' },
            { label: 'Từ chối',      value: counts.rejected, color: 'var(--danger)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '12px 20px', minWidth: 100, textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {applicants.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <h3>Chưa có ứng viên nào</h3>
            <p>Chưa có ai nộp đơn vào tin tuyển dụng này.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applicants.map((app) => (
              <div key={app.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                {/* Row chính */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                }}>
                  {/* Thông tin ứng viên */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>
                      {app.applicant_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cập nhật tên</span>}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>✉ {app.applicant_email}</span>
                      {app.applicant_phone && <span>📞 {app.applicant_phone}</span>}
                      <span>🕐 {app.created_at ? new Date(app.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={app.status} />

                  {/* CV link */}
                  <div>
                    {app.cv_url ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={loadingCv === app.id}
                        onClick={() => openCv(app.id, setLoadingCv)}
                      >
                        {loadingCv === app.id ? '⏳...' : '📄 Xem CV'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không có CV</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {app.cover_letter && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      >
                        {expanded === app.id ? '▲ Thu' : '▼ Thư xin việc'}
                      </button>
                    )}
                    {app.status !== 'accepted' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--success)', color: '#fff', border: 'none' }}
                        disabled={updating === app.id}
                        onClick={() => handleStatus(app.id, 'accepted')}
                      >
                        {updating === app.id ? '...' : '✓ Chấp nhận'}
                      </button>
                    )}
                    {app.status !== 'rejected' && (
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={updating === app.id}
                        onClick={() => handleStatus(app.id, 'rejected')}
                      >
                        {updating === app.id ? '...' : '✕ Từ chối'}
                      </button>
                    )}
                    {app.status === 'pending' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={updating === app.id}
                        onClick={() => handleStatus(app.id, 'reviewed')}
                      >
                        👁 Đã xem
                      </button>
                    )}
                  </div>
                </div>

                {/* Cover letter mở rộng */}
                {expanded === app.id && app.cover_letter && (
                  <div style={{
                    padding: '12px 20px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Thư xin việc
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {app.cover_letter}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
