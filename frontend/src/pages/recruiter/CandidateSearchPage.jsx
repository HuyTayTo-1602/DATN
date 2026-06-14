import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { Avatar } from '../../components/Avatar'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'
import { candidateApi, jobsApi } from '../../services/api'

const PAGE_SIZE = 10

const CandidateSearchPage = () => {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const [cvOpen, setCvOpen] = useState(false)
  const [cvUrl, setCvUrl] = useState(null)
  const [cvLoading, setCvLoading] = useState(false)
  const [cvZoom, setCvZoom] = useState(1)
  const [active, setActive] = useState(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviting, setInviting] = useState(false)
  const [myJobs, setMyJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')

  const triggerSearch = () => {
    setQuery(keyword)
    setPage(1)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    candidateApi.search({ q: query, page, page_size: PAGE_SIZE })
      .then((data) => { if (active) setResult({ items: data?.items || [], total: data?.total || 0 }) })
      .catch(() => { if (active) setResult({ items: [], total: 0 }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, page])

  useEffect(() => () => { if (cvUrl) URL.revokeObjectURL(cvUrl) }, [cvUrl])

  const viewCv = async (c) => {
    setActive(c)
    setCvOpen(true)
    setCvUrl(null)
    setCvLoading(true)
    try {
      const blob = await candidateApi.streamCv(c.user_id)
      setCvUrl(URL.createObjectURL(blob))
    } catch (err) {
      toast.error(err.message || 'Ứng viên này chưa có CV để xem')
    } finally {
      setCvLoading(false)
    }
  }

  const openInvite = async (c) => {
    setActive(c)
    setInviteMessage('')
    setSelectedJobId('')
    setInviteOpen(true)
    try {
      const data = await jobsApi.myJobs()
      setMyJobs((data?.items || data || []).filter((j) => j.status === 'active'))
    } catch {
      setMyJobs([])
    }
  }

  const sendInvite = async () => {
    if (!selectedJobId) {
      toast.error('Vui lòng chọn vị trí tuyển dụng')
      return
    }
    setInviting(true)
    try {
      await candidateApi.invite(active.user_id, { jobId: Number(selectedJobId), message: inviteMessage })
      toast.success(`Đã gửi lời mời ứng tuyển tới ${active.full_name || active.email}`)
      setInviteOpen(false)
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lời mời')
    } finally {
      setInviting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div className="container">
      <div className="section-head" style={{ marginTop: 24 }}>
        <div>
          <h1>Danh sách ứng viên</h1>
          <p>Tìm ứng viên theo kỹ năng, kinh nghiệm phù hợp với nhu cầu của bạn</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="input"
            style={{ flex: 1, fontSize: 'var(--text-base)', height: 48 }}
            placeholder="Tìm theo kỹ năng, kinh nghiệm, vị trí (VD: React, Python, Backend Developer...)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
          />
          <button
            className="btn btn-primary"
            style={{ height: 48, padding: '0 24px', flexShrink: 0 }}
            onClick={triggerSearch}
          >
            <Icon name="search" size={16} />Tìm kiếm
          </button>
        </div>
      </div>

      <div className="jobs-count" style={{ marginBottom: 16 }}>
        {!loading && <>Tìm thấy <strong>{result.total}</strong> ứng viên</>}
      </div>

      {loading ? (
        <Spinner />
      ) : result.items.length === 0 ? (
        <EmptyState icon="users" title="Không tìm thấy ứng viên phù hợp" description="Thử một từ khóa khác hoặc mở rộng phạm vi tìm kiếm." />
      ) : (
        <>
          <div className="company-grid">
            {result.items.map((c) => (
              <article className="company-card" key={c.user_id}>
                <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <Avatar name={c.full_name || c.email} size="lg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="company-card-name">{c.full_name || c.email}</h3>
                    {c.full_name && (
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.email}</span>
                    )}
                  </div>
                </div>
                {c.skills && (
                  <div className="company-card-pills">
                    {c.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5).map((s, i) => (
                      <span key={i} className="badge badge-accent">{s}</span>
                    ))}
                  </div>
                )}
                {c.bio && <p className="company-card-desc">{c.bio}</p>}
                <div className="company-card-meta">
                  {c.experience && (
                    <span className="job-meta-item"><Icon name="briefcase" size={13} />{c.experience}</span>
                  )}
                  {c.cv_file_name && (
                    <span className="job-meta-item"><Icon name="cv" size={13} />{c.cv_file_name}</span>
                  )}
                </div>
                <div className="company-card-foot">
                  <div className="row gap-sm">
                    <button className="btn btn-outline btn-sm" onClick={() => viewCv(c)}>
                      <Icon name="eye" size={12} />Xem CV
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => openInvite(c)}>
                      <Icon name="message" size={12} />Mời ứng tuyển
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} withGoto />}
        </>
      )}

      <Modal
        open={cvOpen}
        onClose={() => { setCvOpen(false); setCvUrl(null); setCvZoom(1) }}
        title={`CV — ${active?.full_name || active?.email || ''}`}
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

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Mời ứng viên ứng tuyển" footer={
        <>
          <button className="btn btn-outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Hủy</button>
          <button className="btn btn-primary" onClick={sendInvite} disabled={inviting}>{inviting ? 'Đang gửi...' : 'Gửi lời mời'}</button>
        </>
      }>
        <div className="text-sm text-secondary mb-4">Gửi lời mời ứng tuyển tới <strong style={{ color: 'var(--color-text-primary)' }}>{active?.full_name || active?.email}</strong>.</div>
        <div className="field">
          <label>Vị trí tuyển dụng <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <select className="input" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            <option value="">-- Chọn vị trí --</option>
            {myJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}{j.company?.name ? ` — ${j.company.name}` : ''}</option>
            ))}
          </select>
          {myJobs.length === 0 && (
            <p className="text-sm text-secondary" style={{ marginTop: 4 }}>Bạn chưa có tin tuyển dụng đang hoạt động.</p>
          )}
        </div>
        <div className="field">
          <label>Lời nhắn <span className="text-muted text-xs">(tùy chọn)</span></label>
          <textarea className="textarea" placeholder="Giới thiệu ngắn gọn về vị trí và lý do bạn muốn mời ứng viên này..." value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}

export default CandidateSearchPage
