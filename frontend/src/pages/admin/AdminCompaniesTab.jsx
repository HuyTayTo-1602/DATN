import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../services/api'

// ── Constants — UNTOUCHED ────────────────────────────────────────────────
const EMPTY_FORM = {
  user_id: '', name: '', description: '', size: '', type: '',
  address: '', website: '', logo_url: '', phone: '',
}

// ── UI-only visual config ────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444']

const SIZE_CFG = {
  '1-50':    { color: '#94a3b8', bg: 'rgba(148,163,184,.14)', border: 'rgba(148,163,184,.3)' },
  '51-200':  { color: '#60a5fa', bg: 'rgba(96,165,250,.14)',  border: 'rgba(96,165,250,.3)'  },
  '201-500': { color: '#4ade80', bg: 'rgba(74,222,128,.14)',  border: 'rgba(74,222,128,.3)'  },
  '500+':    { color: '#f97316', bg: 'rgba(249,115,22,.14)',  border: 'rgba(249,115,22,.3)'  },
}

// ── Shared menu item style ───────────────────────────────────────────────
const menuItemStyle = {
  display: 'flex', alignItems: 'center',
  width: '100%', padding: '10px 14px',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text)', fontSize: '0.875rem', textAlign: 'left',
}

// ── Pure UI sub-components ───────────────────────────────────────────────

function CompanyAvatar({ name }) {
  const initials = (name || '?')
    .trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const bg = AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8, background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.7rem', fontWeight: 700, color: '#fff', userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

function SizeBadge({ size }) {
  if (!size) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
  const c = SIZE_CFG[size] || { color: '#94a3b8', bg: 'rgba(148,163,184,.14)', border: 'rgba(148,163,184,.3)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {size} nhân viên
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
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 560,
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
          Xóa công ty?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28, lineHeight: 1.65 }}>
          Bạn sắp xóa công ty{' '}
          <strong style={{ color: 'var(--text)' }}>{target?.name}</strong>.
          {' '}Toàn bộ job và đơn ứng tuyển liên quan sẽ bị xóa vĩnh viễn.
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

function CompanyViewModal({ company: c, onClose }) {
  const rows = [
    { label: 'ID',        value: c.id },
    { label: 'Tên',       value: c.name },
    { label: 'Loại hình', value: c.type   || <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Quy mô',    value: c.size   ? <SizeBadge size={c.size} /> : <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Địa chỉ',   value: c.address  || <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Số điện thoại', value: c.phone || <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Website',   value: c.website
        ? <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>{c.website}</a>
        : <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'ID chủ sở hữu', value: c.user_id },
  ]
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Chi tiết công ty</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '16px 20px', background: 'var(--surface)', borderRadius: 10 }}>
          <CompanyAvatar name={c.name} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.name}</div>
            {c.type && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.type}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>
        {c.description && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mô tả</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c.description}</p>
          </div>
        )}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────
export default function AdminCompaniesTab() {

  // ── Original state — UNTOUCHED ─────────────────────────────────────────
  const [items,      setItems]      = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const PAGE_SIZE = 10

  // ── UI-only state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget,   setViewTarget]   = useState(null)

  // ── Original logic — UNTOUCHED ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listCompanies({ page, page_size: PAGE_SIZE, search })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (c) => {
    setEditTarget(c)
    setForm({
      user_id: c.user_id, name: c.name, description: c.description || '',
      size: c.size || '', type: c.type || '', address: c.address || '',
      website: c.website || '', logo_url: c.logo_url || '', phone: c.phone || '',
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
        const { user_id, ...updateData } = form
        await adminApi.updateCompany(editTarget.id, updateData)
      } else {
        await adminApi.createCompany({ ...form, user_id: Number(form.user_id) })
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
  const handleDelete = async (c) => {
    try {
      await adminApi.deleteCompany(c.id)
      load()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── UI-only helpers ────────────────────────────────────────────────────
  const openDelete = (c) => setDeleteTarget(c)

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
            QUẢN LÝ CÔNG TY
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Tổng cộng{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{total}</strong>
            {' '}công ty trong hệ thống
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Tạo công ty</button>
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
          placeholder="🔍  Tìm theo tên công ty..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, fontSize: '0.875rem', minWidth: 0 }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
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
          <div className="empty-icon">🏢</div>
          <h3>Không có công ty nào</h3>
          <p>{search ? 'Thử xóa bộ lọc để xem toàn bộ danh sách' : 'Chưa có công ty nào trong hệ thống'}</p>
        </div>
      ) : (
        <>
<div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>STT</th>
                  <th>Tên công ty <SortIcon /></th>
                  <th>Loại hình</th>
                  <th>Quy mô</th>
                  <th>Địa chỉ <SortIcon /></th>
                  <th>SĐT</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <tr key={c.id} className="table-row-hover">
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    {/* Tên công ty + avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CompanyAvatar name={c.name} />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</span>
                      </div>
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {c.type || <span style={{ fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>}
                    </td>

                    <td><SizeBadge size={c.size} /></td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.address || <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {c.phone || <span style={{ fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>}
                    </td>

                    {/* Hành động */}
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewTarget(c)}>Xem</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelete(c)}>Xóa</button>
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
              <strong style={{ color: 'var(--text)' }}>{total}</strong> công ty
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

      {/* View detail modal */}
      {viewTarget && <CompanyViewModal company={viewTarget} onClose={() => setViewTarget(null)} />}

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
        <FormModal title={editTarget ? 'Cập nhật công ty' : 'Tạo công ty mới'} onClose={closeForm}>
          <form onSubmit={handleSubmit}>
            {!editTarget && (
              <div className="form-group">
                <label className="form-label">ID Người sở hữu (recruiter) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" type="number" required value={form.user_id} onChange={set('user_id')} placeholder="Nhập user_id của recruiter" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tên công ty <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input" required value={form.name} onChange={set('name')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Loại hình</label>
                <input className="input" value={form.type} onChange={set('type')} placeholder="Công ty CP, TNHH..." />
              </div>
              <div className="form-group">
                <label className="form-label">Quy mô</label>
                <select className="input" value={form.size} onChange={set('size')}>
                  <option value="">— Chọn —</option>
                  {['1-50','51-200','201-500','500+'].map(s => <option key={s} value={s}>{s} nhân viên</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input className="input" value={form.address} onChange={set('address')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="input" value={form.website} onChange={set('website')} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="input" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea className="input" rows={3} value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
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
