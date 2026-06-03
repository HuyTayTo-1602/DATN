import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../services/api'

// ── Constants — UNTOUCHED ────────────────────────────────────────────────
const STATUSES    = ['active', 'closed', 'draft']
const statusLabel = { active: 'Đang tuyển', closed: 'Đã đóng', draft: 'Nháp' }
const statusColor = { active: '#22c55e', closed: '#ef4444', draft: '#94a3b8' } // kept for compat

const EMPTY_FORM = {
  company_id: '', title: '', level: '', salary: '', location: '',
  deadline: '', status: 'active', description: '', requirements: '', benefits: '',
}

// ── UI-only visual config ────────────────────────────────────────────────
const JOB_STATUS_CFG = {
  active: { label: 'Đang tuyển', icon: '●', color: '#4ade80', bg: 'rgba(74,222,128,.12)',   border: 'rgba(74,222,128,.28)'   },
  closed: { label: 'Đã đóng',   icon: '⊘', color: '#f87171', bg: 'rgba(248,113,113,.12)',  border: 'rgba(248,113,113,.28)'  },
  draft:  { label: 'Nháp',      icon: '◑', color: '#94a3b8', bg: 'rgba(148,163,184,.12)',  border: 'rgba(148,163,184,.28)'  },
}

const LEVEL_CFG = {
  Fresher: { color: '#a78bfa', bg: 'rgba(167,139,250,.14)', border: 'rgba(167,139,250,.3)' },
  Junior:  { color: '#4ade80', bg: 'rgba(74,222,128,.14)',  border: 'rgba(74,222,128,.3)'  },
  Mid:     { color: '#60a5fa', bg: 'rgba(96,165,250,.14)',  border: 'rgba(96,165,250,.3)'  },
  Senior:  { color: '#f97316', bg: 'rgba(249,115,22,.14)',  border: 'rgba(249,115,22,.3)'  },
  Manager: { color: '#e879f9', bg: 'rgba(232,121,249,.14)', border: 'rgba(232,121,249,.3)' },
}

// ── Shared menu item style ───────────────────────────────────────────────
const menuItemStyle = {
  display: 'flex', alignItems: 'center',
  width: '100%', padding: '10px 14px',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text)', fontSize: '0.875rem', textAlign: 'left',
}

// ── Pure UI sub-components ───────────────────────────────────────────────

function JobStatusBadge({ status }) {
  const c = JOB_STATUS_CFG[status] || { label: status, icon: '○', color: '#94a3b8', bg: 'rgba(148,163,184,.12)', border: 'rgba(148,163,184,.28)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <span style={{ fontSize: '0.55rem', lineHeight: 1 }}>{c.icon}</span>
      {c.label}
    </span>
  )
}

function LevelBadge({ level }) {
  if (!level) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
  const c = LEVEL_CFG[level] || { color: '#94a3b8', bg: 'rgba(148,163,184,.14)', border: 'rgba(148,163,184,.3)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {level}
    </span>
  )
}

function SortIcon() {
  return <span style={{ marginLeft: 4, opacity: 0.35, fontSize: '0.68rem', verticalAlign: 'middle' }}>⇅</span>
}

function FormModal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6, lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function DeleteModal({ target, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 400,
        textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.5)',
      }}>
        <div style={{ fontSize: '2.8rem', marginBottom: 12, lineHeight: 1 }}>🗑️</div>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700 }}>
          Xóa tin tuyển dụng?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28, lineHeight: 1.65 }}>
          Bạn sắp xóa tin{' '}
          <strong style={{ color: 'var(--text)' }}>{target?.title}</strong>.
          {' '}Toàn bộ đơn ứng tuyển liên quan sẽ bị xóa vĩnh viễn.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: 100 }}>Hủy</button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 130, padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  )
}

function JobViewModal({ job: j, onClose }) {
  const infoRows = [
    { label: 'ID',          value: j.id },
    { label: 'Tiêu đề',     value: j.title },
    { label: 'Công ty',     value: j.company?.name || <em style={{ color: 'var(--text-muted)' }}>Không rõ</em> },
    { label: 'Cấp bậc',     value: j.level    ? <LevelBadge level={j.level} />        : <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Trạng thái',  value: <JobStatusBadge status={j.status} /> },
    { label: 'Mức lương',   value: j.salary   ? `${j.salary} triệu đồng`              : <em style={{ color: 'var(--text-muted)' }}>Thỏa thuận</em> },
    { label: 'Địa điểm',    value: j.location || <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Hạn nộp',     value: j.deadline ? new Date(j.deadline).toLocaleDateString('vi-VN') : <em style={{ color: 'var(--text-muted)' }}>Không giới hạn</em> },
  ]
  const textSections = [
    { label: 'Mô tả công việc',  value: j.description  },
    { label: 'Yêu cầu ứng viên', value: j.requirements },
    { label: 'Quyền lợi',        value: j.benefits     },
  ].filter(s => s.value)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Chi tiết tin tuyển dụng</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ padding: '14px 20px', background: 'var(--surface)', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{j.title}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{j.company?.name || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {infoRows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>
        {textSections.map(({ label, value }) => (
          <div key={label} style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</p>
          </div>
        ))}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────
export default function AdminJobsTab() {

  // ── Original state — UNTOUCHED ─────────────────────────────────────────
  const [items,        setItems]        = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const PAGE_SIZE = 10

  // ── UI-only state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget,   setViewTarget]   = useState(null)

  // ── Original logic — UNTOUCHED ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listJobs({ page, page_size: PAGE_SIZE, status: filterStatus, search })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (j) => {
    setEditTarget(j)
    setForm({
      company_id: j.company?.id || '',
      title: j.title, level: j.level || '', salary: j.salary || '',
      location: j.location || '', deadline: j.deadline || '',
      status: j.status, description: j.description || '',
      requirements: j.requirements || '', benefits: j.benefits || '',
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditTarget(null) }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        const { company_id, ...updateData } = form
        await adminApi.updateJob(editTarget.id, {
          ...updateData,
          salary: updateData.salary ? Number(updateData.salary) : null,
        })
      } else {
        await adminApi.createJob({
          ...form,
          company_id: Number(form.company_id),
          salary: form.salary ? Number(form.salary) : null,
        })
      }
      closeForm()
      load()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Original delete logic — window.confirm replaced by DeleteModal
  const handleDelete = async (j) => {
    try {
      await adminApi.deleteJob(j.id)
      load()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── UI-only helpers ────────────────────────────────────────────────────
  const hasFilters   = search || filterStatus
  const clearFilters = () => { setSearch(''); setFilterStatus(''); setPage(1) }
  const openDelete = (j) => setDeleteTarget(j)

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  const startRow = (page - 1) * PAGE_SIZE + 1
  const endRow   = Math.min(page * PAGE_SIZE, total)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
          }}>
            QUẢN LÝ VIỆC LÀM
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Tổng cộng{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{total}</strong>
            {' '}tin tuyển dụng trong hệ thống
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Tạo job</button>
      </div>

      {/* Filter toolbar */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 12, padding: '12px 16px',
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <input
          className="input"
          placeholder="🔍  Tìm theo tiêu đề..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, fontSize: '0.875rem', minWidth: 0 }}
        />
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          style={{ flex: '0 0 180px', fontSize: '0.875rem' }}
        >
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 10, opacity: 0.5 }}>⟳</div>
          Đang tải dữ liệu...
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💼</div>
          <h3>Không có tin tuyển dụng nào</h3>
          <p>{hasFilters ? 'Thử xóa bộ lọc để xem toàn bộ danh sách' : 'Chưa có tin tuyển dụng nào trong hệ thống'}</p>
        </div>
      ) : (
        <>
<div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>STT</th>
                  <th>Vị trí <SortIcon /></th>
                  <th>Công ty</th>
                  <th>Địa điểm</th>
                  <th>Cấp bậc</th>
                  <th>Trạng thái</th>
                  <th>Hạn nộp <SortIcon /></th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((j, i) => (
                  <tr key={j.id} className="table-row-hover">
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{j.title}</span>
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {j.company?.name || <span style={{ fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>}
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {j.location || <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>

                    <td><LevelBadge level={j.level} /></td>

                    <td><JobStatusBadge status={j.status} /></td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {j.deadline ? new Date(j.deadline).toLocaleDateString('vi-VN') : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>

                    {/* Hành động */}
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewTarget(j)}>Xem</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelete(j)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Hiển thị {startRow}–{endRow} trong tổng số{' '}
              <strong style={{ color: 'var(--text)' }}>{total}</strong> tin tuyển dụng
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {pageNums.map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                  ) : (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  )
                )}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Job detail view modal */}
      {viewTarget && <JobViewModal job={viewTarget} onClose={() => setViewTarget(null)} />}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={() => { handleDelete(deleteTarget); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Create / Edit form modal */}
      {showForm && (
        <FormModal title={editTarget ? 'Cập nhật tin tuyển dụng' : 'Tạo tin tuyển dụng mới'} onClose={closeForm}>
          <form onSubmit={handleSubmit}>
            {!editTarget && (
              <div className="form-group">
                <label className="form-label">ID Công ty <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" type="number" required value={form.company_id} onChange={set('company_id')} placeholder="Nhập company_id" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tiêu đề <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input" required value={form.title} onChange={set('title')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Cấp bậc</label>
                <select className="input" value={form.level} onChange={set('level')}>
                  <option value="">— Chọn —</option>
                  {['Fresher','Junior','Mid','Senior','Manager'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Mức lương (triệu đồng)</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" min="0" step="1" placeholder="VD: 15"
                    value={form.salary} onChange={set('salary')} style={{ paddingRight: 90 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }}>triệu đồng</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Hạn nộp hồ sơ</label>
                <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Địa điểm</label>
              <input className="input" value={form.location} onChange={set('location')} />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả công việc</label>
              <textarea className="input" rows={3} value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Yêu cầu ứng viên</label>
              <textarea className="input" rows={3} value={form.requirements} onChange={set('requirements')} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Quyền lợi</label>
              <textarea className="input" rows={2} value={form.benefits} onChange={set('benefits')} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}
