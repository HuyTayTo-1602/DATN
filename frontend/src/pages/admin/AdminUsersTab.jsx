import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../services/api'

// ── Constants — UNTOUCHED ────────────────────────────────────────────────
const ROLES    = ['job_seeker', 'recruiter', 'admin']
const STATUSES = ['active', 'inactive', 'banned']

const roleLabel   = { job_seeker: 'Ứng viên', recruiter: 'Nhà tuyển dụng', admin: 'Admin' }
const statusLabel = { active: 'Hoạt động', inactive: 'Không hoạt động', banned: 'Bị khóa' }
const statusColor = { active: '#22c55e', inactive: '#f59e0b', banned: '#ef4444' } // kept for compat

const EMPTY_FORM = { email: '', password: '', role: 'job_seeker', status: 'active' }

// ── UI-only visual config ────────────────────────────────────────────────
const ROLE_BADGE = {
  job_seeker: { bg: 'rgba(20,184,166,.14)', color: '#2dd4bf', border: 'rgba(20,184,166,.3)'  },
  recruiter:  { bg: 'rgba(59,130,246,.14)', color: '#60a5fa', border: 'rgba(59,130,246,.3)'  },
  admin:      { bg: 'rgba(168,85,247,.14)', color: '#c084fc', border: 'rgba(168,85,247,.3)'  },
}

const STATUS_CFG = {
  active:   { label: 'Hoạt động',  icon: '●', color: '#4ade80', bg: 'rgba(74,222,128,.12)',  border: 'rgba(74,222,128,.28)'  },
  inactive: { label: 'Không HĐ',   icon: '◑', color: '#fbbf24', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.28)' },
  banned:   { label: 'Bị khóa',    icon: '⊘', color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.28)' },
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444']

// ── Pure UI sub-components ───────────────────────────────────────────────

function Avatar({ name, email }) {
  const src   = name || email || '?'
  const initials = name
    ? name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase()
    : (email || '?')[0].toUpperCase()
  const bg = AVATAR_COLORS[src.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.7rem', fontWeight: 700, color: '#fff', userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

function RoleBadge({ role }) {
  const c = ROLE_BADGE[role] || { bg: 'rgba(148,163,184,.12)', color: '#94a3b8', border: 'rgba(148,163,184,.3)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {roleLabel[role] || role}
    </span>
  )
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { label: status, icon: '○', color: '#94a3b8', bg: 'rgba(148,163,184,.12)', border: 'rgba(148,163,184,.28)' }
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

// Decorative sort icon — no click logic
function SortIcon() {
  return <span style={{ marginLeft: 4, opacity: 0.35, fontSize: '0.68rem', verticalAlign: 'middle' }}>⇅</span>
}

// Create/Edit form modal — matches dark theme
function FormModal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6,
            lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Delete confirmation modal
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
        textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '2.8rem', marginBottom: 12, lineHeight: 1 }}>🗑️</div>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700 }}>
          Xóa người dùng?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28, lineHeight: 1.65 }}>
          Bạn sắp xóa tài khoản{' '}
          <strong style={{ color: 'var(--text)' }}>{target?.email}</strong>.
          {' '}Toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: 100 }}>
            Hủy
          </button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 130, padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#ef4444', color: '#fff', fontWeight: 600,
              cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  )
}

function UserViewModal({ user, onClose }) {
  const rows = [
    { label: 'ID',          value: user.id },
    { label: 'Email',       value: user.email },
    { label: 'Họ và tên',   value: user.full_name || <em style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</em> },
    { label: 'Vai trò',     value: <RoleBadge role={user.role} /> },
    { label: 'Trạng thái',  value: <StatusBadge status={user.status} /> },
    { label: 'Ngày tạo',    value: new Date(user.created_at).toLocaleDateString('vi-VN') },
  ]
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Chi tiết người dùng</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 6 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '16px 20px', background: 'var(--surface)', borderRadius: 10 }}>
          <Avatar name={user.full_name} email={user.email} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{user.full_name || user.email}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────
export default function AdminUsersTab() {

  // ── Original state — UNTOUCHED ─────────────────────────────────────────
  const [items,        setItems]        = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const PAGE_SIZE = 10

  // ── UI-only state (pure display — no data impact) ──────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget,   setViewTarget]   = useState(null)

  // ── Original logic — UNTOUCHED ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listUsers({
        page, page_size: PAGE_SIZE, search, role: filterRole, status: filterStatus,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterRole, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit   = (u) => { setEditTarget(u); setForm({ email: u.email, role: u.role, status: u.status, password: '' }); setShowForm(true) }
  const closeForm  = () => { setShowForm(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        await adminApi.updateUser(editTarget.id, { email: form.email, role: form.role, status: form.status })
      } else {
        await adminApi.createUser({ email: form.email, password: form.password, role: form.role })
      }
      closeForm()
      load()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Original delete logic — window.confirm replaced by DeleteModal above (UI only)
  const handleDelete = async (u) => {
    try {
      await adminApi.deleteUser(u.id)
      load()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── UI-only helpers ────────────────────────────────────────────────────
  const hasFilters   = search || filterRole || filterStatus
  const clearFilters = () => { setSearch(''); setFilterRole(''); setFilterStatus(''); setPage(1) }

  const openDelete = (u) => setDeleteTarget(u)

  // Smart pagination range
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
      {/* Sub-header: section title + "+ Tạo user" button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
          }}>
            QUẢN LÝ NGƯỜI DÙNG
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Tổng cộng{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{total}</strong>
            {' '}tài khoản trong hệ thống
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tạo user
        </button>
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
          placeholder="🔍  Tìm theo email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, fontSize: '0.875rem', minWidth: 0 }}
        />
        <select
          className="input"
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}
          style={{ flex: '0 0 160px', fontSize: '0.875rem' }}
        >
          <option value="">Tất cả role</option>
          {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          style={{ flex: '0 0 160px', fontSize: '0.875rem' }}
        >
          <option value="">Tất cả status</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>

        {/* "Xóa bộ lọc" — only visible when a filter is active */}
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

      {/* Content area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 10, opacity: 0.5 }}>⟳</div>
          Đang tải dữ liệu...
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <h3>Không có user nào</h3>
          <p>{hasFilters ? 'Thử xóa bộ lọc để xem toàn bộ danh sách' : 'Chưa có tài khoản nào trong hệ thống'}</p>
        </div>
      ) : (
        <>
<div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>STT</th>
                  <th>Email <SortIcon /></th>
                  <th>Tên <SortIcon /></th>
                  <th>Role</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo <SortIcon /></th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u, i) => (
                  <tr key={u.id} className="table-row-hover">
                    {/* STT */}
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    {/* Avatar + Email */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.full_name} email={u.email} />
                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.email}</span>
                      </div>
                    </td>

                    {/* Tên — "Chưa cập nhật" fallback */}
                    <td>
                      {u.full_name
                        ? <span style={{ fontSize: '0.875rem' }}>{u.full_name}</span>
                        : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>Chưa cập nhật</span>
                      }
                    </td>

                    {/* Role badge */}
                    <td><RoleBadge role={u.role} /></td>

                    {/* Status badge */}
                    <td><StatusBadge status={u.status} /></td>

                    {/* Ngày tạo */}
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>

                    {/* Hành động */}
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewTarget(u)}>Xem</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => openDelete(u)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Hiển thị {startRow}–{endRow} trong tổng số{' '}
              <strong style={{ color: 'var(--text)' }}>{total}</strong> người dùng
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >‹</button>

                {pageNums.map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >{p}</button>
                  )
                )}

                <button
                  className="page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* View detail modal */}
      {viewTarget && <UserViewModal user={viewTarget} onClose={() => setViewTarget(null)} />}

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
        <FormModal
          title={editTarget ? 'Cập nhật người dùng' : 'Tạo người dùng mới'}
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Email <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input" type="email" required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            {!editTarget && (
              <div className="form-group">
                <label className="form-label">
                  Mật khẩu <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  className="input" type="password" required minLength={6}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </div>

            {editTarget && (
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
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

// Shared menu item base style
const menuItemStyle = {
  display: 'flex', alignItems: 'center',
  width: '100%', padding: '10px 14px',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text)', fontSize: '0.875rem', textAlign: 'left',
  transition: 'background .12s',
}
