import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import { LevelBadge } from '../components/Badges'
import { CompanyLogo } from '../components/Avatar'
import { Spinner } from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { jobsApi, applicationsApi, cvApi } from '../services/api'
import { LABEL, formatDateVN } from '../utils/format'

const JobDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const toast = useToast()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [applied, setApplied] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cvList, setCvList] = useState([])
  const [selectedCvId, setSelectedCvId] = useState(null)
  const [cvLoading, setCvLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    setApplied(false)

    const jobPromise = jobsApi.get(id)
      .then((data) => { if (active) setJob(data) })
      .catch(() => { if (active) setNotFound(true) })

    const checkApplied = isAuthenticated && role === 'job_seeker'
      ? applicationsApi.mine()
          .then((apps) => {
            if (active) {
              const list = Array.isArray(apps) ? apps : (apps?.items || [])
              setApplied(list.some((a) => String(a.job_id) === String(id)))
            }
          })
          .catch(() => {})
      : Promise.resolve()

    Promise.all([jobPromise, checkApplied]).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, isAuthenticated, role])

  const handleApply = () => {
    if (!isAuthenticated) { setLoginOpen(true); return }
    if (role !== 'job_seeker') return
    setCvLoading(true)
    cvApi.mine()
      .then((cvs) => {
        const list = Array.isArray(cvs) ? cvs : (cvs?.items || [])
        setCvList(list)
        const active = list.find((c) => c.is_active) || list[0] || null
        setSelectedCvId(active?.id || null)
      })
      .catch(() => { setCvList([]); setSelectedCvId(null) })
      .finally(() => setCvLoading(false))
    setApplyOpen(true)
  }

  const submitApplication = async () => {
    setSubmitting(true)
    try {
      await applicationsApi.apply(job.id, coverLetter, selectedCvId)
      setApplyOpen(false)
      setApplied(true)
      toast.success('Đã gửi đơn ứng tuyển thành công!')
    } catch (err) {
      toast.error(err.message || 'Không thể nộp đơn ứng tuyển')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="container">
        <EmptyState icon="briefcase" title="Không tìm thấy tin tuyển dụng" description="Tin tuyển dụng này có thể đã bị gỡ hoặc không tồn tại." action={<button className="btn btn-primary" onClick={() => navigate('/jobs')}>Quay lại danh sách việc làm</button>} />
      </div>
    )
  }

  const company = job.company || {}
  const requirements = (job.requirements || '').split('\n').map((s) => s.trim().replace(/^-\s*/, '')).filter(Boolean)
  const benefits = (job.benefits || '').split('\n').map((s) => s.trim().replace(/^-\s*/, '')).filter(Boolean)

  return (
    <div className="container">
      <div className="detail-layout">
        <div className="detail-main">
          <div className="row" style={{ marginBottom: 12 }}>
            <CompanyLogo company={company} size={56} />
            <div>
              <p className="company-name" style={{ margin: 0 }}>{company.name}</p>
              <h1 className="detail-h1">{job.title}</h1>
            </div>
          </div>
          <div className="job-meta" style={{ marginBottom: 16 }}>
            <span className="job-meta-item"><Icon name="map-pin" size={14} />{job.location}</span>
            <span className="job-meta-item"><Icon name="money" size={14} />{job.salary || 'Thoả thuận'}</span>
            <span className="job-meta-item"><Icon name="calendar" size={14} />Hạn {formatDateVN(job.deadline)}</span>
            {job.level && <LevelBadge level={job.level} />}
          </div>

          <div className="detail-section">
            <h3>Mô tả công việc</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{job.description}</p>
          </div>
          {requirements.length > 0 && (
            <div className="detail-section">
              <h3>Yêu cầu</h3>
              <ul>{requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {benefits.length > 0 && (
            <div className="detail-section">
              <h3>Quyền lợi</h3>
              <ul>{benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
        </div>

        <div className="detail-side">
          <div className="detail-card">
            {applied ? (
              <>
                <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: 'var(--text-sm)', marginBottom: 12, justifyContent: 'center' }}>
                  <Icon name="check" size={14} />Đã nộp đơn — Đang chờ xét
                </div>
                <button className="btn btn-outline btn-block" onClick={() => navigate('/my-applications')}>Xem đơn của tôi</button>
              </>
            ) : (
              <>
                {role === 'recruiter' || role === 'admin' ? (
                  <div className="badge badge-neutral" style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}>
                    Tài khoản nhà tuyển dụng — không thể ứng tuyển
                  </div>
                ) : (
                  <button className="btn btn-primary btn-block btn-lg" onClick={handleApply}>
                    Nộp đơn ngay
                  </button>
                )}
              </>
            )}
            <hr className="divider" />
            <div className="kv-row"><span className="k">Hạn nộp</span><span className="v">{formatDateVN(job.deadline)}</span></div>
            {job.level && <div className="kv-row"><span className="k">Cấp bậc</span><span className="v">{LABEL[job.level] || job.level}</span></div>}
            <div className="kv-row"><span className="k">Hình thức</span><span className="v">Toàn thời gian</span></div>
            <div className="kv-row"><span className="k">Ngày đăng</span><span className="v">{formatDateVN(job.created_at)}</span></div>
          </div>

          <div className="detail-card">
            <h4 style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Về công ty</h4>
            <div className="row" style={{ marginBottom: 12 }}>
              <CompanyLogo company={company} size={44} />
              <div>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{LABEL[company.size] || company.size}</div>
              </div>
            </div>
            {company.address && (
              <div className="text-sm text-secondary" style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: 6 }}>
                <Icon name="map-pin" size={14} style={{ flexShrink: 0, marginTop: 3 }} />{company.address}
              </div>
            )}
            {company.website && (
              <div className="text-sm text-secondary" style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: 12 }}>
                <Icon name="globe" size={14} style={{ flexShrink: 0, marginTop: 3 }} />{company.website}
              </div>
            )}
            <button className="btn btn-outline btn-block" onClick={() => navigate(`/companies/${company.id}`)}>Xem hồ sơ công ty</button>
          </div>
        </div>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Nộp đơn ứng tuyển" footer={
        <>
          <button className="btn btn-outline" onClick={() => setApplyOpen(false)} disabled={submitting}>Hủy</button>
          <button className="btn btn-primary" onClick={submitApplication} disabled={submitting || cvLoading || !selectedCvId}>
            {submitting ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'}
          </button>
        </>
      }>
        <div className="text-sm text-secondary mb-4">Bạn đang ứng tuyển vào vị trí <strong style={{ color: 'var(--color-text-primary)' }}>{job.title}</strong> tại {company.name}.</div>
        <div className="field mb-4">
          <label>Chọn CV để gửi đi</label>
          {cvLoading ? (
            <Spinner size={20} />
          ) : cvList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cvList.map((cv) => (
                <div
                  key={cv.id}
                  className="cv-item"
                  style={{
                    padding: 14,
                    cursor: 'pointer',
                    outline: selectedCvId === cv.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                    borderRadius: 'var(--radius)',
                  }}
                  onClick={() => setSelectedCvId(cv.id)}
                >
                  <div className="cv-icon"><Icon name="file" size={20} /></div>
                  <div className="cv-info">
                    <div className="cv-name">
                      {cv.file_name}
                      {cv.is_active && <span className="badge badge-primary" style={{ marginLeft: 8 }}><Icon name="star" size={11} />CV chính</span>}
                    </div>
                    <div className="cv-meta"><span>Cập nhật {formatDateVN(cv.uploaded_at)}</span></div>
                  </div>
                  {selectedCvId === cv.id && (
                    <Icon name="check" size={16} style={{ marginLeft: 'auto', color: 'var(--color-primary)', flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--color-error)' }}>
              Bạn chưa có CV nào. Vui lòng <Link to="/my-cvs">tải lên CV</Link> trước khi ứng tuyển.
            </div>
          )}
        </div>
        <div className="field">
          <label>Thư giới thiệu <span className="text-muted text-xs">(tùy chọn)</span></label>
          <textarea className="textarea" placeholder="Chia sẻ ngắn gọn vì sao bạn phù hợp với vị trí này..." maxLength={2000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <div className="text-xs text-muted text-right">{coverLetter.length}/2000</div>
        </div>
      </Modal>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="Đăng nhập để ứng tuyển" footer={
        <>
          <button className="btn btn-outline" onClick={() => setLoginOpen(false)}>Để sau</button>
          <button className="btn btn-primary" onClick={() => { setLoginOpen(false); navigate('/login') }}>Đăng nhập</button>
        </>
      }>
        <p>Để gửi đơn ứng tuyển, bạn cần đăng nhập với tài khoản ứng viên. Nếu chưa có tài khoản, bạn có thể đăng ký miễn phí trong vài phút.</p>
      </Modal>
    </div>
  )
}

export default JobDetailPage
