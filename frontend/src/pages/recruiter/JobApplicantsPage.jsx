import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { Avatar } from '../../components/Avatar'
import { StatusBadge } from '../../components/Badges'
import { Spinner } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { applicationsApi, jobsApi, candidateApi } from '../../services/api'
import { formatDateVN } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: 'accepted', label: 'Đồng ý', desc: 'Gửi thông báo chấp nhận cho ứng viên', icon: 'check', bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
  { value: 'rejected', label: 'Từ chối', desc: 'Gửi thông báo từ chối nhã nhặn', icon: 'x', bg: 'var(--color-error-light)', fg: 'var(--color-error)' },
]

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 18px',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
      background: 'none',
      border: 'none',
      borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
)

const MatchCard = ({ candidate, rank, maxScore, jobId }) => {
  const toast = useToast()
  const [cvLoading, setCvLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState(false)

  const scorePercent = maxScore > 0 ? Math.min(100, Math.round((candidate.score / maxScore) * 100)) : 0
  const barColor =
    scorePercent >= 70 ? 'var(--color-success, #22c55e)'
    : scorePercent >= 40 ? 'var(--color-warning, #f59e0b)'
    : 'var(--color-primary)'

  const skillList = candidate.skills
    ? candidate.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
    : []

  const handleViewCv = async () => {
    if (!candidate.cv_id) return
    setCvLoading(true)
    try {
      const blob = await candidateApi.streamCv(candidate.user_id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast.error('Không thể tải CV')
    } finally {
      setCvLoading(false)
    }
  }

  const handleInvite = async () => {
    setInviting(true)
    try {
      await candidateApi.invite(candidate.user_id, { jobId, message: '' })
      toast.success(`Đã gửi lời mời đến ${candidate.full_name || 'ứng viên'}`)
      setInvited(true)
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lời mời')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '16px 18px',
      background: 'var(--color-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--color-primary-bg, #eff6ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, color: 'var(--color-primary)',
          flexShrink: 0,
        }}>
          {candidate.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidate.full_name || 'Ứng viên ẩn danh'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Hạng #{rank}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: barColor }}>{scorePercent}%</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>phù hợp</div>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${scorePercent}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>

      {/* Skills */}
      {skillList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {skillList.map((s) => (
            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-primary-bg, #eff6ff)', color: 'var(--color-primary)' }}>{s}</span>
          ))}
          {candidate.skills?.split(',').length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>+{candidate.skills.split(',').length - 4}</span>
          )}
        </div>
      )}

      {/* Bio */}
      {candidate.bio && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {candidate.bio}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button
          className="btn btn-outline btn-sm"
          style={{ flex: 1, fontSize: 12 }}
          onClick={handleViewCv}
          disabled={!candidate.cv_id || cvLoading}
        >
          {cvLoading ? '...' : <><Icon name="file-text" size={12} /> Xem CV</>}
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1, fontSize: 12 }}
          onClick={handleInvite}
          disabled={inviting || invited}
        >
          {invited ? <><Icon name="check" size={12} /> Đã mời</> : inviting ? '...' : <><Icon name="mail" size={12} /> Mời ứng tuyển</>}
        </button>
      </div>
    </div>
  )
}

const JobApplicantsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState('applicants')

  // Applicants
  const [job, setJob] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cvOpen, setCvOpen] = useState(false)
  const [cvUrl, setCvUrl] = useState(null)
  const [cvLoading, setCvLoading] = useState(false)
  const [cvZoom, setCvZoom] = useState(1)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Matches
  const [matches, setMatches] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(null)
  const matchLoaded = useRef(false)

  const load = () => {
    setLoading(true)
    return Promise.all([jobsApi.get(id), applicationsApi.forJob(id)])
      .then(([jobData, appsData]) => {
        setJob(jobData)
        setApplicants(Array.isArray(appsData) ? appsData : (appsData?.items || []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => () => { if (cvUrl) URL.revokeObjectURL(cvUrl) }, [cvUrl])

  // Load matches lazily when switching to the tab
  useEffect(() => {
    if (tab !== 'matches' || matchLoaded.current) return
    matchLoaded.current = true
    setMatchLoading(true)
    setMatchError(null)
    candidateApi.matchForJob(id, 10)
      .then((res) => setMatches(res.items || []))
      .catch(() => setMatchError('Không thể tải ứng viên tiềm năng'))
      .finally(() => setMatchLoading(false))
  }, [tab, id])

  const filtered = useMemo(() => applicants.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (search) {
      const k = search.toLowerCase()
      if (!(a.applicant_name || '').toLowerCase().includes(k) && !(a.applicant_email || '').toLowerCase().includes(k)) return false
    }
    return true
  }), [applicants, search, statusFilter])

  const viewCv = async (a) => {
    setActive(a)
    setCvOpen(true)
    setCvUrl(null)
    setCvLoading(true)
    try {
      const blob = await applicationsApi.streamCv(a.id)
      setCvUrl(URL.createObjectURL(blob))
    } catch (err) {
      toast.error(err.message || 'Không thể tải CV')
    } finally {
      setCvLoading(false)
    }
  }

  const openStatusModal = (a) => { setActive(a); setStatusModalOpen(true) }

  const updateStatus = async (status) => {
    setUpdating(true)
    try {
      await applicationsApi.updateStatus(active.id, status)
      setApplicants((list) => list.map((a) => (a.id === active.id ? { ...a, status } : a)))
      toast.success('Đã cập nhật trạng thái')
      setStatusModalOpen(false)
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật trạng thái')
    } finally {
      setUpdating(false)
    }
  }

  const maxScore = matches[0]?.score || 0

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 64, paddingBottom: 64, display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <button className="btn btn-outline" style={{ marginBottom: 20, gap: 6 }} onClick={() => navigate('/recruiter/jobs')}>
        <Icon name="arrow-left" size={15} />Quay lại
      </button>
      <div className="page-head">
        <div>
          <div className="crumbs">Quản lý tin <Icon name="chevron-right" size={11} /> {job?.title}</div>
          <h1>{tab === 'matches' ? 'Ứng viên tiềm năng' : 'Ứng viên đã nộp đơn'}</h1>
          <p className="text-secondary mb-0">
            {tab === 'matches'
              ? `Ứng viên được hệ thống gợi ý phù hợp với vị trí "${job?.title}"`
              : `Tổng ${applicants.length} đơn cho vị trí "${job?.title}"`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        <TabBtn active={tab === 'applicants'} onClick={() => setTab('applicants')}>
          <Icon name="users" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Đã nộp đơn
          <span style={{
            marginLeft: 6, fontSize: 11, fontWeight: 700,
            background: tab === 'applicants' ? 'var(--color-primary)' : 'var(--color-border)',
            color: tab === 'applicants' ? '#fff' : 'var(--color-text-secondary)',
            padding: '1px 7px', borderRadius: 20,
          }}>{applicants.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'matches'} onClick={() => setTab('matches')}>
          <Icon name="sparkles" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Ứng viên tiềm năng
        </TabBtn>
      </div>

      {/* ── Tab: Đã nộp đơn ── */}
      {tab === 'applicants' && (
        <>
          <div className="row" style={{ gap: 12, marginBottom: 20 }}>
            <div className="input-icon" style={{ flex: 1 }}>
              <Icon name="search" size={16} />
              <input className="input" placeholder="Tìm theo tên, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select" style={{ width: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xét</option>
              <option value="accepted">Đồng ý</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="inbox" title="Chưa có ứng viên nào" description="Khi có người ứng tuyển vào vị trí này, danh sách sẽ hiển thị tại đây." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ứng viên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="row gap-sm">
                          <Avatar name={a.applicant_name || a.applicant_email} size="sm" />
                          <div style={{ fontWeight: 600 }}>{a.applicant_name || '—'}</div>
                        </div>
                      </td>
                      <td className="text-sm">{a.applicant_email}</td>
                      <td className="text-sm">{a.applicant_phone || '—'}</td>
                      <td className="text-sm">{formatDateVN(a.created_at)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => viewCv(a)}><Icon name="eye" size={12} />Xem CV</button>
                          <button className="btn btn-outline btn-sm" onClick={() => openStatusModal(a)}>Cập nhật</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Ứng viên tiềm năng ── */}
      {tab === 'matches' && (
        matchLoading ? (
          <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : matchError ? (
          <p style={{ color: 'var(--color-error)', textAlign: 'center', marginTop: 40 }}>{matchError}</p>
        ) : matches.length === 0 ? (
          <EmptyState
            icon="user-x"
            title="Chưa có ứng viên tiềm năng"
            description="Không tìm thấy ứng viên nào có hồ sơ khớp với yêu cầu công việc này."
          />
        ) : (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Xếp hạng theo mức độ phù hợp dựa trên hồ sơ và nội dung CV
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {matches.map((c, i) => (
                <MatchCard
                  key={c.user_id}
                  candidate={c}
                  rank={i + 1}
                  maxScore={maxScore}
                  jobId={Number(id)}
                />
              ))}
            </div>
          </>
        )
      )}

      {/* CV Modal */}
      <Modal
        open={cvOpen}
        onClose={() => { setCvOpen(false); setCvUrl(null); setCvZoom(1) }}
        title={`CV — ${active?.applicant_name || ''}`}
        fullscreen
        toolbar={!cvLoading && cvUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="icon-btn" onClick={() => setCvZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={cvZoom <= 0.5} title="Thu nhỏ"><Icon name="zoom-out" size={16} /></button>
            <span style={{ fontSize: 12, minWidth: 38, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{Math.round(cvZoom * 100)}%</span>
            <button className="icon-btn" onClick={() => setCvZoom(z => Math.min(2, +(z + 0.25).toFixed(2)))} disabled={cvZoom >= 2} title="Phóng to"><Icon name="zoom-in" size={16} /></button>
            <button className="icon-btn" onClick={() => setCvZoom(1)} title="Đặt lại zoom"><Icon name="maximize" size={16} /></button>
            <a href={cvUrl} download className="icon-btn" title="Tải xuống" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', textDecoration: 'none' }}><Icon name="download" size={16} /></a>
          </div>
        ) : null}
      >
        <div style={{ height: '100%', overflow: 'auto', background: 'var(--color-surface-2)', display: 'flex', alignItems: cvLoading ? 'center' : 'flex-start', justifyContent: 'center' }}>
          {cvLoading ? <Spinner /> : cvUrl ? (
            <iframe
              key={cvZoom}
              title="cv"
              src={cvUrl}
              style={{ width: `${cvZoom * 100}%`, minWidth: '100%', height: '100%', border: 'none', background: '#fff', display: 'block', flexShrink: 0 }}
            />
          ) : (
            <div className="text-secondary text-sm">Không thể hiển thị CV.</div>
          )}
        </div>
      </Modal>

      {/* Status Modal */}
      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Cập nhật trạng thái" footer={
        <button className="btn btn-outline" onClick={() => setStatusModalOpen(false)} disabled={updating}>Đóng</button>
      }>
        <p className="text-sm text-secondary mb-4">Chọn trạng thái mới cho ứng viên <strong style={{ color: 'var(--color-text-primary)' }}>{active?.applicant_name}</strong>. Ứng viên sẽ nhận được thông báo tương ứng.</p>
        <div className="col" style={{ gap: 10 }}>
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="role-card" onClick={() => !updating && updateStatus(opt.value)}>
              <div className="role-icon" style={{ background: opt.bg, color: opt.fg }}><Icon name={opt.icon} size={16} /></div>
              <div><div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{opt.label}</div><div className="text-xs text-muted">{opt.desc}</div></div>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default JobApplicantsPage
