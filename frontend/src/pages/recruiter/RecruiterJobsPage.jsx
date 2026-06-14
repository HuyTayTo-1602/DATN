import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { StatusBadge, LevelBadge } from '../../components/Badges'
import { useToast } from '../../components/Toast'
import { jobsApi, companiesApi, candidateApi, applicationsApi } from '../../services/api'
import LocationFields from '../../components/LocationFields'
import { WORK_MODES } from '../../utils/locations'
import { formatDateVN } from '../../utils/format'

const emptyForm = {
  company_id: '', title: '', level: 'Junior', salary: '',
  work_mode: 'onsite', province: '', district: '', address_detail: '',
  deadline: '', description: '', requirements: '', benefits: '',
}

const isExpired = (job) => job.deadline && new Date(job.deadline) < new Date()

const TODAY = new Date().toISOString().split('T')[0]


// ── Application status helpers ──────────────────────────────────
const APP_STATUS = {
  pending:  { label: 'Chờ duyệt', color: '#6b7280', bg: '#f3f4f6' },
  accepted: { label: 'Chấp nhận', color: '#16a34a', bg: '#dcfce7' },
  rejected: { label: 'Từ chối',   color: '#dc2626', bg: '#fee2e2' },
}

// ── Applicant card (đã nộp đơn) ─────────────────────────────────
const ApplicantCard = ({ app }) => {
  const toast = useToast()
  const [cvLoading, setCvLoading] = useState(false)
  const s = APP_STATUS[app.status] || APP_STATUS.pending

  const handleViewCv = async () => {
    setCvLoading(true)
    try {
      const blob = await applicationsApi.streamCv(app.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast.error('Không thể tải CV')
    } finally {
      setCvLoading(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '14px 16px',
      background: 'var(--color-surface, #fff)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'var(--color-primary-bg, #eff6ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: 'var(--color-primary)',
          flexShrink: 0,
        }}>
          {app.applicant_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {app.applicant_name || 'Ứng viên'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {app.applicant_email}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
          color: s.color, background: s.bg, flexShrink: 0,
        }}>
          {s.label}
        </span>
      </div>

      {/* Cover letter snippet */}
      {app.cover_letter && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {app.cover_letter}
        </div>
      )}

      {/* Footer: date + view CV */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {app.created_at ? new Date(app.created_at).toLocaleDateString('vi-VN') : '—'}
        </span>
        <button
          className="btn btn-outline btn-sm"
          style={{ fontSize: 12 }}
          onClick={handleViewCv}
          disabled={cvLoading}
        >
          {cvLoading ? '...' : <><Icon name="file-text" size={12} /> Xem CV</>}
        </button>
      </div>
    </div>
  )
}

// ── Candidate match card (tiềm năng) ────────────────────────────
const CandidateMatchCard = ({ candidate, rank, maxScore, jobId }) => {
  const toast = useToast()
  const [cvLoading, setCvLoading] = useState(false)
  const [inviting, setInviting] = useState(false)

  const scorePercent = maxScore > 0 ? Math.min(100, Math.round((candidate.score / maxScore) * 100)) : 0
  const barColor =
    scorePercent >= 70 ? 'var(--color-success, #22c55e)'
    : scorePercent >= 40 ? 'var(--color-warning, #f59e0b)'
    : 'var(--color-primary)'

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
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lời mời')
    } finally {
      setInviting(false)
    }
  }

  const skillList = candidate.skills
    ? candidate.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
    : []

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '14px 16px',
      background: 'var(--color-surface, #fff)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'var(--color-primary-bg, #eff6ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: 'var(--color-primary)',
          flexShrink: 0,
        }}>
          {candidate.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidate.full_name || 'Ứng viên ẩn danh'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>#{rank}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: barColor }}>{scorePercent}%</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>phù hợp</div>
        </div>
      </div>

      <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${scorePercent}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>

      {skillList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {skillList.map((s) => (
            <span key={s} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--color-primary-bg, #eff6ff)', color: 'var(--color-primary)' }}>{s}</span>
          ))}
          {candidate.skills?.split(',').length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>+{candidate.skills.split(',').length - 4}</span>
          )}
        </div>
      )}

      {candidate.bio && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {candidate.bio}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={handleViewCv} disabled={!candidate.cv_id || cvLoading}>
          {cvLoading ? '...' : <><Icon name="file-text" size={12} /> Xem CV</>}
        </button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={handleInvite} disabled={inviting}>
          {inviting ? '...' : <><Icon name="mail" size={12} /> Mời</>}
        </button>
      </div>
    </div>
  )
}

// ── Tab button ───────────────────────────────────────────────────
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
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

// ── Job detail panel (2 tabs) ────────────────────────────────────
const JobDetailPanel = ({ job, onClose }) => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('applicants')

  // Applicants
  const [applicants, setApplicants] = useState([])
  const [appLoading, setAppLoading] = useState(true)
  const [appError, setAppError] = useState(null)

  // Matches
  const [matches, setMatches] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(null)
  const matchLoaded = useRef(false)
  const jobIdRef = useRef(job.id)

  // Load applicants on mount / job change
  useEffect(() => {
    jobIdRef.current = job.id
    setTab('applicants')
    setAppLoading(true)
    setAppError(null)
    setMatches([])
    matchLoaded.current = false

    applicationsApi.forJob(job.id)
      .then((data) => {
        if (jobIdRef.current !== job.id) return
        setApplicants(Array.isArray(data) ? data : (data?.items || []))
      })
      .catch(() => {
        if (jobIdRef.current === job.id) setAppError('Không thể tải danh sách ứng viên')
      })
      .finally(() => {
        if (jobIdRef.current === job.id) setAppLoading(false)
      })
  }, [job.id])

  // Load matches lazily when user switches to "Tiềm năng" tab
  useEffect(() => {
    if (tab !== 'matches' || matchLoaded.current) return
    matchLoaded.current = true
    setMatchLoading(true)
    setMatchError(null)
    candidateApi.matchForJob(job.id, 5)
      .then((res) => {
        if (jobIdRef.current === job.id) setMatches(res.items || [])
      })
      .catch(() => {
        if (jobIdRef.current === job.id) setMatchError('Không thể tải ứng viên tiềm năng')
      })
      .finally(() => {
        if (jobIdRef.current === job.id) setMatchLoading(false)
      })
  }, [tab, job.id])

  const maxScore = matches[0]?.score || 0

  return (
    <div style={{
      marginTop: 20,
      border: '1.5px solid var(--color-primary)',
      borderRadius: 12,
      background: 'var(--color-surface, #fff)',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px 0',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TabBtn active={tab === 'applicants'} onClick={() => setTab('applicants')}>
            <Icon name="users" size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Đã nộp đơn{!appLoading && ` (${applicants.length})`}
          </TabBtn>
          <TabBtn active={tab === 'matches'} onClick={() => setTab('matches')}>
            <Icon name="star" size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Ứng viên tiềm năng
          </TabBtn>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <strong>{job.title}</strong>
            {job.level && <> · {job.level}</>}
          </span>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: 20 }}>

        {/* ── Tab: Đã nộp đơn ── */}
        {tab === 'applicants' && (
          appLoading ? (
            <div style={{ padding: '24px 0' }}><Spinner /></div>
          ) : appError ? (
            <p style={{ color: 'var(--color-error)', textAlign: 'center' }}>{appError}</p>
          ) : applicants.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Chưa có ứng viên nào nộp đơn"
              description="Chia sẻ tin tuyển dụng để nhận được đơn ứng tuyển."
            />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {applicants.map((app) => (
                  <ApplicantCard key={app.id} app={app} />
                ))}
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/recruiter/jobs/${job.id}/applicants`)}
                >
                  Xem tất cả & quản lý trạng thái →
                </button>
              </div>
            </>
          )
        )}

        {/* ── Tab: Tiềm năng ── */}
        {tab === 'matches' && (
          matchLoading ? (
            <div style={{ padding: '24px 0' }}><Spinner /></div>
          ) : matchError ? (
            <p style={{ color: 'var(--color-error)', textAlign: 'center' }}>{matchError}</p>
          ) : matches.length === 0 ? (
            <EmptyState
              icon="user-x"
              title="Chưa có ứng viên tiềm năng"
              description="Không tìm thấy ứng viên nào có hồ sơ khớp với yêu cầu công việc này."
            />
          ) : (
            <>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Xếp hạng theo PostgreSQL ts_rank — profile + nội dung CV
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {matches.map((c, i) => (
                  <CandidateMatchCard
                    key={c.user_id}
                    candidate={c}
                    rank={i + 1}
                    maxScore={maxScore}
                    jobId={job.id}
                  />
                ))}
              </div>
            </>
          )
        )}

      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
const RecruiterJobsPage = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [noCompanyModal, setNoCompanyModal] = useState(false)
  const [confirmJob, setConfirmJob] = useState(null)

  const load = () => {
    setLoading(true)
    return Promise.all([jobsApi.myJobs(), companiesApi.myCompany()])
      .then(([jobsData, companyData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : (jobsData?.items || []))
        setCompany(companyData || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => jobs.filter((j) => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'active' && isExpired(j)) return false
    if (statusFilter === 'expired' && !isExpired(j)) return false
    return true
  }), [jobs, search, statusFilter])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setLoc = (patch) => setForm((f) => ({ ...f, ...patch }))

  const openCreate = () => {
    if (!company) { setNoCompanyModal(true); return }
    setEditing(null)
    setForm({ ...emptyForm, company_id: company.id })
    setModalOpen(true)
  }

  const openEdit = (j) => {
    setEditing(j)
    setForm({
      company_id: j.company?.id || '',
      title: j.title || '',
      level: j.level || 'Junior',
      salary: j.salary != null ? String(j.salary).replace(/\D/g, '') : '',
      work_mode: j.work_mode || 'onsite',
      province: j.province || '',
      district: j.district || '',
      address_detail: j.address_detail || '',
      deadline: j.deadline || '',
      description: j.description || '',
      requirements: j.requirements || '',
      benefits: j.benefits || '',
    })
    setModalOpen(true)
  }

  const buildPayload = () => {
    const remote = form.work_mode === 'remote'
    return {
      ...(editing ? {} : { company_id: Number(form.company_id) }),
      title: form.title,
      level: form.level || null,
      salary: form.salary ? parseInt(form.salary, 10) : null,
      work_mode: form.work_mode || 'onsite',
      province: remote ? null : (form.province || null),
      district: remote ? null : (form.district || null),
      address_detail: remote ? null : (form.address_detail || null),
      deadline: form.deadline || null,
      status: 'active',
      description: form.description || null,
      requirements: form.requirements || null,
      benefits: form.benefits || null,
    }
  }

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Vui lòng nhập vị trí tuyển dụng'); return }
    if (!form.salary) { toast.error('Vui lòng nhập mức lương'); return }
    if (form.work_mode !== 'remote' && !form.province) { toast.error('Vui lòng chọn tỉnh/thành phố'); return }
    if (!form.deadline) { toast.error('Vui lòng chọn hạn nộp'); return }
    if (!form.description.trim()) { toast.error('Vui lòng nhập mô tả công việc'); return }
    if (!form.requirements.trim()) { toast.error('Vui lòng nhập yêu cầu ứng viên'); return }
    if (!form.benefits.trim()) { toast.error('Vui lòng nhập quyền lợi'); return }
    if (!editing && !form.company_id) { toast.error('Chưa có thông tin công ty'); return }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) {
        await jobsApi.update(editing.id, payload)
        toast.success('Đã cập nhật tin tuyển dụng')
      } else {
        await jobsApi.create(payload)
        toast.success('Đã đăng tin tuyển dụng')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể lưu tin tuyển dụng')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirmJob) return
    try {
      await jobsApi.delete(confirmJob.id)
      toast.success('Đã xóa tin tuyển dụng')
      setConfirmJob(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa tin tuyển dụng')
      setConfirmJob(null)
    }
  }

  const handleRowClick = (j) => {
    navigate(`/recruiter/jobs/${j.id}/applicants`)
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head">
        <div>
          <h1>Quản lý tin tuyển dụng</h1>
          <p className="text-secondary mb-0">Tạo, chỉnh sửa và theo dõi tin đăng của bạn</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={14} />Đăng tin mới</button>
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 20 }}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Tìm theo tiêu đề..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang tuyển</option>
          <option value="expired">Đã hết hạn</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon="briefcase" title="Chưa có tin tuyển dụng nào" description="Đăng tin tuyển dụng đầu tiên để bắt đầu tìm kiếm ứng viên." action={<button className="btn btn-primary" onClick={openCreate}>Đăng tin mới</button>} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Công ty</th>
                  <th style={{ textAlign: 'center' }}>Ứng viên</th>
                  <th>Cấp bậc</th>
                  <th>Trạng thái</th>
                  <th>Hạn nộp</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  return (
                    <tr
                      key={j.id}
                      onClick={() => handleRowClick(j)}
                      title="Nhấn để xem danh sách ứng viên"
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{j.title}</div>
                        <div className="text-xs text-muted">{j.location} · {j.salary ? `${j.salary} triệu` : 'Thoả thuận'}</div>
                      </td>
                      <td className="text-sm">{j.company?.name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {j.applicant_count ?? 0}
                        </span>
                      </td>
                      <td>{j.level ? <LevelBadge level={j.level} /> : '—'}</td>
                      <td><StatusBadge status={isExpired(j) ? 'expired' : 'active'} ctx="job" /></td>
                      <td className="text-sm">{formatDateVN(j.deadline)}</td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          {/* Xem ứng viên */}
                          <button
                            className="icon-btn"
                            title="Xem ứng viên"
                            onClick={(e) => { e.stopPropagation(); handleRowClick(j) }}
                          >
                            <Icon name="users" size={14} />
                          </button>
                          {/* Chỉnh sửa */}
                          <button className="icon-btn" title="Chỉnh sửa" onClick={(e) => { e.stopPropagation(); openEdit(j) }}>
                            <Icon name="pencil" size={14} />
                          </button>
                          {/* Xóa */}
                          <button className="icon-btn" title="Xóa" style={{ color: 'var(--color-error)' }} onClick={(e) => { e.stopPropagation(); setConfirmJob(j) }}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Nhấn vào một tin tuyển dụng để xem danh sách ứng viên
          </p>
        </>
      )}

      {/* Confirm delete modal */}
      <Modal open={!!confirmJob} onClose={() => setConfirmJob(null)} title="Xác nhận xóa tin" maxWidth={420} footer={
        <>
          <button className="btn btn-outline" onClick={() => setConfirmJob(null)}>Hủy</button>
          <button className="btn btn-danger" onClick={remove}>Xóa tin</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 4px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-error-bg, #fff1f0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash" size={26} style={{ color: 'var(--color-error, #ef4444)' }} />
          </div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>Xóa tin tuyển dụng?</p>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Tin <strong>"{confirmJob?.title}"</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
          </p>
        </div>
      </Modal>

      {/* No company modal */}
      <Modal open={noCompanyModal} onClose={() => setNoCompanyModal(false)} title="Chưa có thông tin công ty" maxWidth={420} footer={
        <>
          <button className="btn btn-outline" onClick={() => setNoCompanyModal(false)}>Để sau</button>
          <button className="btn btn-primary" onClick={() => navigate('/recruiter/companies')}>Tạo công ty ngay</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 4px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-warning-bg, #fff8e1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="building" size={26} style={{ color: 'var(--color-warning, #f59e0b)' }} />
          </div>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Bạn cần tạo thông tin công ty trước khi đăng tin tuyển dụng. Hãy thêm công ty để tiếp tục.
          </p>
        </div>
      </Modal>

      {/* Create/edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa tin tuyển dụng' : 'Tạo tin tuyển dụng'} maxWidth={720} footer={
        <>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={() => submit()} disabled={saving}>
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Đăng tin'}
          </button>
        </>
      }>
        <div className="form-grid">
          <div className="field full">
            <label>Vị trí tuyển dụng *</label>
            <input className="input" placeholder="VD: Senior Backend Engineer (Java)" value={form.title} onChange={(e) => setField('title', e.target.value)} />
          </div>
          <div className="field">
            <label>Cấp bậc *</label>
            <select className="select" value={form.level} onChange={(e) => setField('level', e.target.value)}>
              <option>Fresher</option><option>Junior</option><option>Mid</option><option>Senior</option><option>Manager</option>
            </select>
          </div>
          <div className="field">
            <label>Mức lương * <span className="text-muted text-xs">(triệu đồng)</span></label>
            <input className="input" type="number" min="0" placeholder="VD: 25" value={form.salary} onChange={(e) => setField('salary', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="field">
            <label>Hình thức làm việc *</label>
            <select className="select" value={form.work_mode} onChange={(e) => setField('work_mode', e.target.value)}>
              {WORK_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Hạn nộp *</label>
            <input type="date" className="input" min={TODAY} value={form.deadline || ''} onChange={(e) => setField('deadline', e.target.value)} />
          </div>
          {form.work_mode !== 'remote' && (
            <LocationFields
              province={form.province}
              district={form.district}
              addressDetail={form.address_detail}
              onChange={setLoc}
              required
            />
          )}
          <div className="field full">
            <label>Mô tả công việc *</label>
            <textarea className="textarea" rows={4}
              placeholder={"VD:\n- Phát triển và duy trì các tính năng hệ thống web/mobile.\n- Thiết kế REST API, phối hợp với team Product & Designer.\n- Review code, viết unit test, tham gia sprint theo Agile/Scrum."}
              value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </div>
          <div className="field full">
            <label>Yêu cầu ứng viên *</label>
            <textarea className="textarea" rows={4}
              placeholder={"VD:\n- Tốt nghiệp Đại học CNTT hoặc tương đương.\n- Ít nhất 2 năm kinh nghiệm với công nghệ liên quan.\n- Quen thuộc Git, CI/CD, quy trình Agile."}
              value={form.requirements} onChange={(e) => setField('requirements', e.target.value)} />
          </div>
          <div className="field full">
            <label>Quyền lợi *</label>
            <textarea className="textarea" rows={3}
              placeholder={"VD:\n- Lương cạnh tranh, xét tăng lương 6 tháng/lần.\n- Bảo hiểm sức khỏe, thưởng tháng 13.\n- Hybrid linh hoạt, ngân sách đào tạo hàng năm."}
              value={form.benefits} onChange={(e) => setField('benefits', e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RecruiterJobsPage
