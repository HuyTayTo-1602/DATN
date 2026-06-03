import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { companiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import ProvinceSelect from '../components/ProvinceSelect'

const COMPANY_TYPES = [
  'Công ty Cổ phần',
  'Công ty TNHH',
  'Doanh nghiệp tư nhân',
  'Công ty Nhà nước',
  'Tập đoàn',
  'Startup',
  'Khác',
]
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

function buildTypeSelection(type) {
  if (!type) return { sel: '', other: '' }
  if (COMPANY_TYPES.includes(type)) return { sel: type, other: '' }
  return { sel: 'Khác', other: type }
}

function InfoRow({ icon, label, value, href }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '1.1rem', width: 24, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', fontWeight: 500 }}>{value}</a>
          : <div style={{ fontWeight: 500 }}>{value}</div>
        }
      </div>
    </div>
  )
}

export default function MyCompaniesPage() {
  const { user } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // form state
  const [form, setForm] = useState({})
  const [typeOther, setTypeOther] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'recruiter') return
    companiesApi.myCompanies()
      .then(list => setCompany(list[0] || null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const openEdit = () => {
    if (!company) return
    const { sel, other } = buildTypeSelection(company.type)
    setForm({
      name: company.name || '',
      description: company.description || '',
      size: company.size || '',
      type: sel,
      address: company.address || '',
      website: company.website || '',
      logo_url: company.logo_url || '',
      phone: company.phone || '',
    })
    setTypeOther(other)
    setError('')
    setEditing(true)
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

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
      const updated = await companiesApi.update(company.id, payload)
      setCompany(updated)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho nhà tuyển dụng.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Công ty của tôi</h1>
          <p>Xem và chỉnh sửa thông tin doanh nghiệp</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 28, maxWidth: 760 }}>
        {loading ? (
          <Spinner />
        ) : !company ? (
          <div className="empty">
            <div className="empty-icon">🏢</div>
            <h3>Chưa có thông tin công ty</h3>
            <p>Thông tin công ty sẽ được tạo khi bạn đăng tin tuyển dụng đầu tiên.</p>
            <Link to="/post-job" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              Đăng tin tuyển dụng
            </Link>
          </div>
        ) : !editing ? (
          /* ── Chế độ xem ── */
          <div className="card" style={{ padding: 32 }}>
            {/* Logo + tên */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border)' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: 14, background: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{company.name}</h2>
                {company.type && (
                  <span className="badge badge-blue" style={{ marginTop: 6 }}>{company.type}</span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={openEdit}
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              >
                ✏️ Chỉnh sửa
              </button>
            </div>

            {/* Mô tả */}
            {company.description && (
              <p style={{
                color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.92rem',
                margin: '0 0 20px', padding: '0 0 20px', borderBottom: '1px solid var(--border)',
              }}>
                {company.description}
              </p>
            )}

            {/* Chi tiết */}
            <div>
              <InfoRow icon="👥" label="Quy mô" value={company.size ? `${company.size} nhân viên` : null} />
              <InfoRow icon="📍" label="Địa chỉ" value={company.address} />
              <InfoRow icon="📞" label="Số điện thoại" value={company.phone} />
              <InfoRow icon="🌐" label="Website" value={company.website} href={company.website} />
            </div>

            {!company.size && !company.address && !company.phone && !company.website && !company.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', marginTop: 8 }}>
                Hồ sơ công ty chưa đầy đủ. Nhấn "Chỉnh sửa" để bổ sung thông tin.
              </p>
            )}
          </div>
        ) : (
          /* ── Chế độ chỉnh sửa ── */
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Chỉnh sửa thông tin công ty</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕ Hủy</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tên công ty *</label>
                <input className="input" value={form.name} onChange={set('name')} required autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Loại hình doanh nghiệp <span style={{ color: 'red' }}>*</span></label>
                  <select className="input" value={form.type} onChange={set('type')} required>
                    <option value="">-- Chọn loại hình --</option>
                    {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.type === 'Khác' && (
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      placeholder="Nhập loại hình doanh nghiệp..."
                      value={typeOther}
                      onChange={e => setTypeOther(e.target.value)}
                      required
                    />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Quy mô nhân sự <span style={{ color: 'red' }}>*</span></label>
                  <select className="input" value={form.size} onChange={set('size')} required>
                    <option value="">-- Chọn quy mô --</option>
                    {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} nhân viên</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Tỉnh / Thành phố <span style={{ color: 'red' }}>*</span></label>
                  <ProvinceSelect value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                  <input className="input" type="tel" placeholder="028 xxxx xxxx" value={form.phone} onChange={set('phone')} required />
                </div>
              </div>

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

              <div className="form-group">
                <label className="form-label">Mô tả công ty <span style={{ color: 'red' }}>*</span></label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Lĩnh vực hoạt động, sản phẩm/dịch vụ, văn hóa công ty..."
                  value={form.description}
                  onChange={set('description')}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '✅ Lưu thay đổi'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
