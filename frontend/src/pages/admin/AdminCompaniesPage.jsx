import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { CompanyLogo } from '../../components/Avatar'
import { Spinner } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { adminApi } from '../../services/api'
import { LABEL } from '../../utils/format'

const PAGE_SIZE = 10
const emptyForm = { user_id: '', name: '', description: '', size: '1-50', type: 'Công ty TNHH', address: '', website: '', phone: '', logo_url: '' }

const AdminCompaniesPage = () => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    return adminApi.listCompanies({ page, page_size: PAGE_SIZE, search: q || undefined })
      .then((data) => setResult({ items: data?.items || [], total: data?.total || 0 }))
      .catch(() => setResult({ items: [], total: 0 }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, q])

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setQ(search) }
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      user_id: '', name: c.name || '', description: c.description || '', size: c.size || '1-50',
      type: c.type || 'Công ty TNHH', address: c.address || '', website: c.website || '',
      phone: c.phone || '', logo_url: c.logo_url || '',
    })
    setModalOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên công ty'); return }
    if (!editing && !form.user_id) { toast.error('Vui lòng nhập ID nhà tuyển dụng sở hữu'); return }
    setSaving(true)
    try {
      const { user_id, ...rest } = form
      if (editing) {
        await adminApi.updateCompany(editing.id, rest)
        toast.success('Đã cập nhật công ty')
      } else {
        await adminApi.createCompany({ ...rest, user_id: Number(user_id) })
        toast.success('Đã thêm công ty mới')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể lưu công ty')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Xóa công ty "${c.name}"?`)) return
    try {
      await adminApi.deleteCompany(c.id)
      toast.success('Đã xóa công ty')
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa công ty')
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="crumbs">Trang quản trị <Icon name="chevron-right" size={11} /> Công ty</div>
          <h1>Quản lý công ty</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={14} />Thêm công ty</button>
      </div>

      <form className="row" style={{ gap: 12, marginBottom: 20 }} onSubmit={submitSearch}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Tìm theo tên công ty..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : result.items.length === 0 ? (
        <EmptyState icon="building" title="Không tìm thấy công ty" description="Thử thay đổi từ khóa tìm kiếm." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Tên công ty</th>
                <th>Quy mô</th>
                <th>Địa chỉ</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((c) => (
                <tr key={c.id}>
                  <td><CompanyLogo company={c} size={36} /></td>
                  <td><div style={{ fontWeight: 600 }}>{c.name}</div><div className="text-xs text-muted">{c.type}</div></td>
                  <td className="text-sm">{LABEL[c.size] || c.size || '—'}</td>
                  <td className="text-sm">{c.address || '—'}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" onClick={() => openEdit(c)}><Icon name="pencil" size={14} /></button>
                      <button className="icon-btn" style={{ color: 'var(--color-error)' }} onClick={() => remove(c)}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa công ty' : 'Thêm công ty mới'} maxWidth={620} footer={
        <>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>
      }>
        <div className="form-grid">
          {!editing && (
            <div className="field full"><label>ID nhà tuyển dụng sở hữu *</label><input className="input" type="number" min="1" placeholder="VD: 12" value={form.user_id} onChange={(e) => setField('user_id', e.target.value.replace(/\D/g, ''))} /></div>
          )}
          <div className="field full"><label>Tên công ty *</label><input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} /></div>
          <div className="field full"><label>Mô tả</label><textarea className="textarea" value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
          <div className="field"><label>Quy mô</label>
            <select className="select" value={form.size} onChange={(e) => setField('size', e.target.value)}>
              <option value="1-50">1–50</option>
              <option value="51-200">51–200</option>
              <option value="201-500">201–500</option>
              <option value="500+">500+</option>
            </select>
          </div>
          <div className="field"><label>Loại hình</label>
            <select className="select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
              <option>Công ty TNHH</option>
              <option>Công ty Cổ phần</option>
              <option>Doanh nghiệp tư nhân</option>
              <option>Công ty Nhà nước</option>
              <option>Tập đoàn</option>
              <option>Startup</option>
            </select>
          </div>
          <div className="field full"><label>Địa chỉ</label><input className="input" value={form.address} onChange={(e) => setField('address', e.target.value)} /></div>
          <div className="field"><label>Website</label><input className="input" value={form.website} onChange={(e) => setField('website', e.target.value)} /></div>
          <div className="field"><label>Số điện thoại</label><input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></div>
          <div className="field full"><label>Logo (URL)</label><input className="input" placeholder="https://..." value={form.logo_url} onChange={(e) => setField('logo_url', e.target.value)} /></div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminCompaniesPage
