import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { jobsApi, applicationsApi, profileApi, cvApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

const levelColor = { Junior: 'badge-green', Mid: 'badge-blue', Senior: 'badge-orange', Manager: 'badge-purple' }
const PROFILE_FIELDS = ['full_name', 'phone', 'dob', 'address', 'bio', 'skills', 'experience', 'education']
const isProfileComplete = (p) => p && PROFILE_FIELDS.every((f) => p[f]?.trim())

export default function JobDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Profile check
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Active CV
  const [activeCv, setActiveCv] = useState(null)
  const [cvLoaded, setCvLoaded] = useState(false)

  // Apply state
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    jobsApi.get(id)
      .then(setJob)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (user?.role === 'job_seeker') {
      profileApi.get()
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setProfileLoaded(true))

      cvApi.mine()
        .then((list) => setActiveCv(list.find((c) => c.is_active) ?? null))
        .catch(() => setActiveCv(null))
        .finally(() => setCvLoaded(true))
    }
  }, [user])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplying(true)
    setApplyMsg({ type: '', text: '' })
    try {
      await applicationsApi.apply(id, coverLetter)
      setApplyMsg({ type: 'success', text: '🎉 Nộp đơn thành công! Chúc bạn may mắn.' })
      setShowApplyForm(false)
    } catch (err) {
      setApplyMsg({ type: 'error', text: err.message })
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <Spinner />

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 480, margin: '0 auto' }}>
          ⚠️ {error}
        </div>
        <Link to="/jobs" className="btn btn-primary mt-4" style={{ display: 'inline-flex' }}>
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  const deadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString('vi-VN')
    : 'Không giới hạn'

  const createdAt = job.created_at
    ? new Date(job.created_at).toLocaleDateString('vi-VN')
    : null

  return (
    <div className="container">
      <div className="job-detail-layout">
        {/* Main Content */}
        <main>
          <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16, marginTop: 24 }}>
            ← Quay lại danh sách
          </Link>

          <div className="job-detail-main">
            {/* Header */}
            <div className="job-detail-header">
              <h1>{job.title}</h1>

              <div className="job-detail-company">
                <span style={{ fontSize: '1.5rem' }}>🏢</span>
                <span style={{ fontWeight: 600 }}>{job.company?.name || 'Công ty chưa cập nhật'}</span>
                {job.company?.address && <span>• {job.company.address}</span>}
              </div>

              <div className="job-detail-meta">
                {job.location && <span className="badge badge-gray">📍 {job.location}</span>}
                {job.salary && <span className="badge badge-green">💰 {job.salary} triệu đồng</span>}
                {job.level && <span className={`badge ${levelColor[job.level] || 'badge-gray'}`}>{job.level}</span>}
                <span className={`badge ${job.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                  {job.status === 'active' ? '● Đang tuyển' : '● Đã đóng'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="job-detail-body">
              {applyMsg.text && (
                <div className={`alert alert-${applyMsg.type === 'success' ? 'success' : 'error'}`}>
                  {applyMsg.text}
                </div>
              )}

              {job.description && (
                <div className="job-section">
                  <h3>📋 Mô tả công việc</h3>
                  <p>{job.description}</p>
                </div>
              )}

              {job.requirements && (
                <div className="job-section">
                  <h3>✅ Yêu cầu ứng viên</h3>
                  <p>{job.requirements}</p>
                </div>
              )}

              {job.benefits && (
                <div className="job-section">
                  <h3>🎁 Quyền lợi</h3>
                  <p>{job.benefits}</p>
                </div>
              )}

              {!job.description && !job.requirements && !job.benefits && (
                <div className="empty" style={{ padding: '32px 0' }}>
                  <p>Nhà tuyển dụng chưa cập nhật thông tin chi tiết.</p>
                </div>
              )}

              {/* Apply Form */}
              {showApplyForm && (
                <div style={{ marginTop: 24, padding: 24, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: 16, color: 'var(--primary-light)', fontWeight: 700 }}>
                    📝 Nộp đơn ứng tuyển
                  </h3>
                  <form onSubmit={handleApply}>
                    {/* CV đính kèm tự động */}
                    <div className="form-group">
                      <label className="form-label">CV đính kèm</label>
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span>📎</span>
                        <span style={{ fontWeight: 500 }}>{activeCv?.file_name}</span>
                      </div>
                      <div className="form-hint">
                        Muốn dùng CV khác? <Link to="/profile" style={{ color: 'var(--primary)' }}>Đổi CV active</Link> trong trang Hồ sơ.
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Thư xin việc</label>
                      <textarea
                        className="input"
                        rows={5}
                        placeholder="Giới thiệu bản thân và lý do bạn phù hợp với vị trí này..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={applying}>
                        {applying ? '⏳ Đang gửi...' : '📤 Gửi đơn'}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowApplyForm(false)}>
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside>
          <div className="job-sidebar-card" style={{ marginTop: 56 }}>
            <h3>Thông tin tuyển dụng</h3>

            <div className="info-row">
              <span className="icon">💰</span>
              <div>
                <div className="label">Mức lương</div>
                <div className="value">{job.salary ? `${job.salary} triệu đồng` : 'Thỏa thuận'}</div>
              </div>
            </div>

            <div className="info-row">
              <span className="icon">📍</span>
              <div>
                <div className="label">Địa điểm</div>
                <div className="value">{job.location || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <div className="info-row">
              <span className="icon">🎯</span>
              <div>
                <div className="label">Cấp bậc</div>
                <div className="value">{job.level || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <div className="info-row">
              <span className="icon">🗓</span>
              <div>
                <div className="label">Hạn nộp hồ sơ</div>
                <div className="value">{deadline}</div>
              </div>
            </div>

            {createdAt && (
              <div className="info-row">
                <span className="icon">📅</span>
                <div>
                  <div className="label">Ngày đăng</div>
                  <div className="value">{createdAt}</div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {!user ? (
                <div>
                  <Link to="/login" className="btn btn-primary btn-full">
                    Đăng nhập để ứng tuyển
                  </Link>
                  <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 10 }}>
                    Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--primary)' }}>Đăng ký</Link>
                  </p>
                </div>
              ) : user.role === 'job_seeker' && job.status === 'active' ? (
                applyMsg.type === 'success' ? (
                  <div className="alert alert-success">✅ Đã nộp đơn thành công!</div>
                ) : profileLoaded && !isProfileComplete(profile) ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="alert alert-error" style={{ marginBottom: 12, textAlign: 'left' }}>
                      ⚠️ Bạn cần hoàn thiện <strong>hồ sơ cá nhân</strong> trước khi ứng tuyển.
                    </div>
                    <Link to="/profile" className="btn btn-primary btn-full">
                      Hoàn thiện hồ sơ ngay
                    </Link>
                  </div>
                ) : cvLoaded && !activeCv ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="alert alert-error" style={{ marginBottom: 12, textAlign: 'left' }}>
                      📎 Bạn cần <strong>upload CV</strong> trong trang Hồ sơ trước khi ứng tuyển.
                    </div>
                    <Link to="/profile" className="btn btn-primary btn-full">
                      Upload CV ngay
                    </Link>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => setShowApplyForm(!showApplyForm)}
                  >
                    {showApplyForm ? '✕ Đóng form' : '📤 Ứng tuyển ngay'}
                  </button>
                )
              ) : user.role === 'recruiter' ? (
                <div className="alert alert-info">👔 Bạn đang xem với tư cách nhà tuyển dụng</div>
              ) : job.status !== 'active' ? (
                <div className="alert alert-error">⛔ Tin tuyển dụng đã đóng</div>
              ) : null}
            </div>
          </div>

          {/* Company Info */}
          {job.company && (
            <div className="job-sidebar-card" style={{ marginTop: 16 }}>
              <h3>Về công ty</h3>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{job.company.name}</div>
              {job.company.address && (
                <div className="text-sm text-muted">📍 {job.company.address}</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
