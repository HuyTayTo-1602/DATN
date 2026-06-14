import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { StatusBadge, LevelBadge } from '../../components/Badges'
import { useToast } from '../../components/Toast'
import { adminApi } from '../../services/api'
import { formatDateVN } from '../../utils/format'

const PAGE_SIZE = 10
const emptyForm = {
  company_id: '', title: '', level: 'Junior', salary: '', location: '',
  deadline: '', status: 'active', description: '', requirements: '', benefits: '',
}

const AdminJobsPage = () => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const [companies, setCompanies] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    return adminApi.listJobs({ page, page_size: PAGE_SIZE, status: status || undefined, search: q || undefined })
      .then((data) => setResult({ items: data?.items || [], total: data?.total || 0 }))
      .catch(() => setResult({ items: [], total: 0 }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, status, q])

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setQ(search) }
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const ensureCompanies = async () => {
    if (companies.length) return companies
    try {
      const data = await adminApi.listCompanies({ page: 1, page_size: 100 })
      const items = data?.items || []
      setCompanies(items)
      return items
    } catch {
      return []
    }
  }

  const openCreate = async () => {
    const list = await ensureCompanies()
    if (list.length === 0) { toast.error('Chưa có công ty nào trong hệ thống để gán tin tuyển dụng'); return }
    setEditing(null)
    setForm({ ...emptyForm, company_id: list[0].id })
    setModalOpen(true)
  }

  const openEdit = async (j) => {
    await ensureCompanies()
    setEditing(j)
    setForm({
      company_id: j.company?.id || '',
      title: j.title || '',
      level: j.level || 'Junior',
      salary: j.salary != null ? String(j.salary).replace(/\D/g, '') : '',
      location: j.location || '',
      deadline: j.deadline || '',
      status: j.status || 'active',
      description: j.description || '',
      requirements: j.requirements || '',
      benefits: j.benefits || '',
    })
    setModalOpen(true)
  }

  const buildPayload = () => ({
    ...(editing ? {} : { company_id: Number(form.company_id) }),
    title: form.title,
    level: form.level || null,
    salary: form.salary ? parseInt(form.salary, 10) : null,
    location: form.location || null,
    deadline: form.deadline || null,
    status: form.status,
    description: form.description || null,
    requirements: form.requirements || null,
    benefits: form.benefits || null,
  })

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề tin tuyển dụng'); return }
    if (!editing && !form.company_id) { toast.error('Vui lòng chọn công ty'); return }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) {
        await adminApi.updateJob(editing.id, payload)
        toast.success('Đã cập nhật tin tuyển dụng')
      } else {
        await adminApi.createJob(payload)
        toast.success('Đã tạo tin tuyển dụng')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể lưu tin tuyển dụng')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (j) => {
    if (!window.confirm(`Xóa tin "${j.title}"?`)) return
    try {
      await adminApi.deleteJob(j.id)
      toast.success('Đã xóa tin tuyển dụng')
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa tin tuyển dụng')
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="crumbs">Trang quản trị <Icon name="chevron-right" size={11} /> Việc làm</div>
          <h1>Quản lý tin tuyển dụng</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={14} />Thêm tin</button>
      </div>

      <form className="row" style={{ gap: 12, marginBottom: 20 }} onSubmit={submitSearch}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input className="input" placeholder="Tìm theo tiêu đề..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 200 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang tuyển</option>
          <option value="closed">Đã đóng</option>
        </select>
      </form>

      {loading ? (
        <Spinner />
      ) : result.items.length === 0 ? (
        <EmptyState icon="briefcase" title="Không tìm thấy tin tuyển dụng" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Công ty</th>
                <th>Cấp bậc</th>
                <th>Trạng thái</th>
                <th>Hạn nộp</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((j) => (
                <tr key={j.id}>
                  <td><div style={{ fontWeight: 600 }}>{j.title}</div><div className="text-xs text-muted">{j.location} · {j.salary ? `${j.salary} triệu` : 'Thoả thuận'}</div></td>
                  <td className="text-sm">{j.company?.name || '—'}</td>
                  <td>{j.level ? <LevelBadge level={j.level} /> : '—'}</td>
                  <td><StatusBadge status={j.status} ctx="job" /></td>
                  <td className="text-sm">{formatDateVN(j.deadline)}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" onClick={() => openEdit(j)}><Icon name="pencil" size={14} /></button>
                      <button className="icon-btn" style={{ color: 'var(--color-error)' }} onClick={() => remove(j)}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa tin tuyển dụng' : 'Tạo tin tuyển dụng'} maxWidth={720} footer={
        <>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo tin'}</button>
        </>
      }>
        <div className="form-grid">
          <div className="field">
            <label>Công ty *</label>
            <select className="select" value={form.company_id} onChange={(e) => setField('company_id', e.target.value)} disabled={!!editing}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Cấp bậc</label>
            <select className="select" value={form.level} onChange={(e) => setField('level', e.target.value)}>
              <option>Fresher</option><option>Junior</option><option>Mid</option><option>Senior</option><option>Manager</option>
            </select>
          </div>
          <div className="field full"><label>Tiêu đề tin *</label><input className="input" placeholder="VD: Senior Backend Engineer (Java)" value={form.title} onChange={(e) => setField('title', e.target.value)} /></div>
          <div className="field"><label>Mức lương <span className="text-muted text-xs">(triệu đồng)</span></label>
            <input className="input" type="number" min="0" placeholder="VD: 25" value={form.salary} onChange={(e) => setField('salary', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="field"><label>Địa điểm</label><input className="input" placeholder="Hà Nội / TP.HCM" value={form.location} onChange={(e) => setField('location', e.target.value)} /></div>
          <div className="field"><label>Hạn nộp</label><input type="date" className="input" value={form.deadline || ''} onChange={(e) => setField('deadline', e.target.value)} /></div>
          <div className="field"><label>Trạng thái</label>
            <select className="select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="active">Đang tuyển</option><option value="closed">Đã đóng</option>
            </select>
          </div>
          <div className="field full"><label>Mô tả công việc</label><textarea className="textarea" rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
          <div className="field full"><label>Yêu cầu</label><textarea className="textarea" rows={4} value={form.requirements} onChange={(e) => setField('requirements', e.target.value)} /></div>
          <div className="field full"><label>Quyền lợi</label><textarea className="textarea" rows={3} value={form.benefits} onChange={(e) => setField('benefits', e.target.value)} /></div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminJobsPage
