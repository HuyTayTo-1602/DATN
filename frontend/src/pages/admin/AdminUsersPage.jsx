import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { Avatar } from '../../components/Avatar'
import { StatusBadge } from '../../components/Badges'
import { Spinner } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { adminApi } from '../../services/api'
import { LABEL, formatDateVN } from '../../utils/format'

const PAGE_SIZE = 10
const emptyForm = { email: '', password: '', role: 'job_seeker', status: 'active' }

const AdminUsersPage = () => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    return adminApi.listUsers({ page, page_size: PAGE_SIZE, role: role || undefined, status: status || undefined, search: q || undefined })
      .then((data) => setResult({ items: data?.items || [], total: data?.total || 0 }))
      .catch(() => setResult({ items: [], total: 0 }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, role, status, q])

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setQ(search) }

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (u) => { setEditing(u); setForm({ email: u.email, password: '', role: u.role, status: u.status }); setModalOpen(true) }

  const submit = async () => {
    if (!form.email.trim()) { toast.error('Vui lòng nhập email'); return }
    if (!editing && form.password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateUser(editing.id, { email: form.email, role: form.role, status: form.status })
        toast.success('Đã cập nhật người dùng')
      } else {
        await adminApi.createUser({ email: form.email, password: form.password, role: form.role })
        toast.success('Đã tạo người dùng mới')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể lưu người dùng')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (u) => {
    if (!window.confirm(`Xóa người dùng "${u.email}"?`)) return
    try {
      await adminApi.deleteUser(u.id)
      toast.success('Đã xóa người dùng')
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa người dùng')
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="crumbs">Trang quản trị <Icon name="chevron-right" size={11} /> Người dùng</div>
          <h1>Quản lý người dùng</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={14} />Tạo người dùng</button>
      </div>

      <form className="row" style={{ gap: 12, marginBottom: 20 }} onSubmit={submitSearch}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Tìm theo email, họ tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
          <option value="">Tất cả vai trò</option>
          <option value="job_seeker">Ứng viên</option>
          <option value="recruiter">Nhà tuyển dụng</option>
          <option value="admin">Quản trị viên</option>
        </select>
        <select className="select" style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
          <option value="banned">Đã khóa</option>
        </select>
      </form>

      {loading ? (
        <Spinner />
      ) : result.items.length === 0 ? (
        <EmptyState icon="users" title="Không tìm thấy người dùng" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row gap-sm">
                      <Avatar name={u.full_name || u.email} size="sm" />
                      <span style={{ fontWeight: 600 }}>{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="text-sm">{u.email}</td>
                  <td className="text-sm">{LABEL[u.role] || u.role}</td>
                  <td><StatusBadge status={u.status} ctx="user" /></td>
                  <td className="text-sm">{formatDateVN(u.created_at)}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" onClick={() => openEdit(u)}><Icon name="pencil" size={14} /></button>
                      <button className="icon-btn" style={{ color: 'var(--color-error)' }} onClick={() => remove(u)}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa người dùng' : 'Tạo người dùng'} footer={
        <>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>
      }>
        <div className="col" style={{ gap: 14 }}>
          <div className="field"><label>Email *</label><input className="input" value={form.email} onChange={(e) => setField('email', e.target.value)} /></div>
          {!editing && (
            <div className="field"><label>Mật khẩu * <span className="text-muted text-xs">(tối thiểu 6 ký tự)</span></label><input type="password" className="input" value={form.password} onChange={(e) => setField('password', e.target.value)} /></div>
          )}
          <div className="field"><label>Vai trò</label>
            <select className="select" value={form.role} onChange={(e) => setField('role', e.target.value)}>
              <option value="job_seeker">Ứng viên</option>
              <option value="recruiter">Nhà tuyển dụng</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
          {editing && (
            <div className="field"><label>Trạng thái</label>
              <select className="select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
                <option value="banned">Đã khóa</option>
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default AdminUsersPage
