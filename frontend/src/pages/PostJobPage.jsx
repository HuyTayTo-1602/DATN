import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { jobsApi, companiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import ProvinceSelect from '../components/ProvinceSelect'

const LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Manager']


const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

const COMPANY_TYPES = [
  'Công ty Cổ phần',
  'Công ty TNHH',
  'Doanh nghiệp tư nhân',
  'Công ty Nhà nước',
  'Tập đoàn',
  'Startup',
  'Khác',
]

// ── Form tạo công ty (đầy đủ tất cả trường) ──────────────────
function CreateCompanyForm({ onCreated }) {
  const [typeOther, setTypeOther] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    size: '',
    type: '',
    address: '',
    website: '',
    logo_url: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const setAddr = (v) => setForm((p) => ({ ...p, address: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim())        { setError('Vui lòng nhập tên công ty'); return }
    if (!form.type)               { setError('Vui lòng chọn loại hình doanh nghiệp'); return }
    if (form.type === 'Khác' && !typeOther.trim()) { setError('Vui lòng nhập loại hình doanh nghiệp'); return }
    if (!form.size)               { setError('Vui lòng chọn quy mô nhân sự'); return }
    if (!form.address)            { setError('Vui lòng chọn tỉnh/thành phố'); return }
    if (!form.phone.trim())       { setError('Vui lòng nhập số điện thoại'); return }
    if (!form.website.trim())     { setError('Vui lòng nhập website công ty'); return }
    if (!form.logo_url.trim())    { setError('Vui lòng nhập URL logo công ty'); return }
    if (!form.description.trim()) { setError('Vui lòng nhập mô tả công ty'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        size: form.size,
        type: form.type === 'Khác' ? typeOther.trim() : form.type,
        address: form.address,
        website: form.website.trim(),
        logo_url: form.logo_url.trim(),
        phone: form.phone.trim(),
      }
      const company = await companiesApi.create(payload)
      onCreated(company)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, maxWidth: 680 }}>
      <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 6 }}>🏢 Tạo hồ sơ công ty</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
        Điền đầy đủ thông tin công ty trước khi đăng tin tuyển dụng.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Tên công ty */}
        <div className="form-group">
          <label className="form-label">Tên công ty <span style={{ color: 'red' }}>*</span></label>
          <input className="input" placeholder="VD: Công ty TNHH ABC Technology" value={form.name} onChange={set('name')} required autoFocus />
        </div>

        {/* Loại hình + Quy mô */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Loại hình doanh nghiệp <span style={{ color: 'red' }}>*</span></label>
            <select className="input" value={form.type} onChange={set('type')} required>
              <option value="">-- Chọn loại hình --</option>
              {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {form.type === 'Khác' && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Nhập loại hình doanh nghiệp..."
                value={typeOther}
                onChange={(e) => setTypeOther(e.target.value)}
                required
                autoFocus
              />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Quy mô nhân sự <span style={{ color: 'red' }}>*</span></label>
            <select className="input" value={form.size} onChange={set('size')} required>
              <option value="">-- Chọn quy mô --</option>
              {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} nhân viên</option>)}
            </select>
          </div>
        </div>

        {/* Địa điểm + SĐT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Tỉnh / Thành phố <span style={{ color: 'red' }}>*</span></label>
            <ProvinceSelect value={form.address} onChange={setAddr} />
          </div>
          <div className="form-group">
            <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
            <input className="input" type="tel" placeholder="028 xxxx xxxx" value={form.phone} onChange={set('phone')} required />
          </div>
        </div>

        {/* Website + Logo URL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Website <span style={{ color: 'red' }}>*</span></label>
            <input className="input" type="url" placeholder="https://company.vn" value={form.website} onChange={set('website')} required />
          </div>
          <div className="form-group">
            <label className="form-label">URL Logo <span style={{ color: 'red' }}>*</span></label>
            <input className="input" type="url" placeholder="https://..." value={form.logo_url} onChange={set('logo_url')} required />
          </div>
        </div>

        {/* Mô tả */}
        <div className="form-group">
          <label className="form-label">Mô tả công ty <span style={{ color: 'red' }}>*</span></label>
          <textarea
            className="input"
            rows={3}
            placeholder="Lĩnh vực hoạt động, sản phẩm/dịch vụ chính, văn hóa công ty..."
            value={form.description}
            onChange={set('description')}
            style={{ resize: 'vertical' }}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? '⏳ Đang tạo...' : '✅ Tạo công ty & tiếp tục'}
        </button>
      </form>
    </div>
  )
}

// ── Trang chính PostJob ───────────────────────────────────────
export default function PostJobPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    company_id: '',
    title: '',
    level: '',
    salary: '',
    location: '',
    deadline: '',
    description: '',
    requirements: '',
    benefits: '',
  })

  useEffect(() => {
    if (user?.role !== 'recruiter') return
    companiesApi.myCompanies()
      .then((data) => {
        setCompanies(data)
        if (data.length > 0) setForm((f) => ({ ...f, company_id: data[0].id }))
      })
      .catch(console.error)
      .finally(() => setLoadingCompanies(false))
  }, [user])

  // Sau khi tạo công ty thành công
  const handleCompanyCreated = (newCompany) => {
    setCompanies([newCompany])
    setForm((f) => ({ ...f, company_id: newCompany.id }))
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setLocation = (v) => setForm((f) => ({ ...f, location: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim())       { setError('Vui lòng nhập tên vị trí'); return }
    if (!form.level)              { setError('Vui lòng chọn cấp bậc'); return }
    if (!form.salary)             { setError('Vui lòng nhập mức lương'); return }
    if (!form.location)           { setError('Vui lòng chọn địa điểm làm việc'); return }
    if (!form.deadline)           { setError('Vui lòng chọn hạn nộp hồ sơ'); return }
    if (!form.description.trim()) { setError('Vui lòng nhập mô tả công việc'); return }
    if (!form.requirements.trim()){ setError('Vui lòng nhập yêu cầu ứng viên'); return }
    if (!form.benefits.trim())    { setError('Vui lòng nhập quyền lợi'); return }

    setSubmitting(true)
    try {
      const payload = {
        company_id: Number(form.company_id),
        title: form.title.trim(),
        level: form.level,
        salary: Number(form.salary),
        location: form.location,
        deadline: form.deadline,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        benefits: form.benefits.trim(),
      }
      const job = await jobsApi.create(payload)
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho nhà tuyển dụng.
        </div>
        <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Đăng nhập</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Đăng tin tuyển dụng</h1>
          <p>Tiếp cận hàng ngàn ứng viên tiềm năng</p>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 20px', maxWidth: 760 }}>
        {loadingCompanies ? (
          <Spinner text="Đang tải thông tin công ty..." />
        ) : companies.length === 0 ? (
          // Chưa có công ty → hiện form tạo công ty
          <CreateCompanyForm onCreated={handleCompanyCreated} />
        ) : (
          // Đã có công ty → hiện form đăng tin
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Thông tin cơ bản */}
              <div style={cardStyle}>
                <h3 style={titleStyle}>📋 Thông tin cơ bản</h3>

                <div className="form-group">
                  <label className="form-label">Tên vị trí <span style={{ color: 'red' }}>*</span></label>
                  <input className="input" placeholder="VD: Frontend Developer, Marketing Manager..." value={form.title} onChange={set('title')} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Cấp bậc <span style={{ color: 'red' }}>*</span></label>
                    <select className="input" value={form.level} onChange={set('level')} required>
                      <option value="">Chọn cấp bậc</option>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mức lương (triệu đồng) <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="VD: 15"
                        value={form.salary}
                        onChange={set('salary')}
                        style={{ paddingRight: 90 }}
                        required
                      />
                      <span style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none',
                      }}>triệu đồng</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa điểm làm việc <span style={{ color: 'red' }}>*</span></label>
                    <ProvinceSelect value={form.location} onChange={setLocation} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hạn nộp hồ sơ <span style={{ color: 'red' }}>*</span></label>
                    <input className="input" type="date" value={form.deadline} onChange={set('deadline')} min={new Date().toISOString().split('T')[0]} required />
                  </div>
                </div>
              </div>

              {/* Mô tả */}
              <div style={cardStyle}>
                <h3 style={titleStyle}>📝 Chi tiết công việc</h3>
                <div className="form-group">
                  <label className="form-label">Mô tả công việc <span style={{ color: 'red' }}>*</span></label>
                  <textarea className="input" rows={5} placeholder="Mô tả chi tiết công việc, trách nhiệm..." value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Yêu cầu ứng viên <span style={{ color: 'red' }}>*</span></label>
                  <textarea className="input" rows={4} placeholder="Kỹ năng, kinh nghiệm, bằng cấp..." value={form.requirements} onChange={set('requirements')} style={{ resize: 'vertical' }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Quyền lợi <span style={{ color: 'red' }}>*</span></label>
                  <textarea className="input" rows={3} placeholder="Bảo hiểm, bonus, nghỉ phép..." value={form.benefits} onChange={set('benefits')} style={{ resize: 'vertical' }} required />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                  {submitting ? '⏳ Đang đăng...' : '🚀 Đăng tin tuyển dụng'}
                </button>
                <Link to="/my-jobs" className="btn btn-ghost btn-lg">Hủy</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 28,
  marginBottom: 20,
}

const titleStyle = {
  fontWeight: 700,
  fontSize: '1rem',
  color: 'var(--text)',
  marginBottom: 20,
}
