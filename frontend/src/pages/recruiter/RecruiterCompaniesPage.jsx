import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { CompanyLogo } from '../../components/Avatar'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'
import { companiesApi } from '../../services/api'
import LocationFields from '../../components/LocationFields'
import { LABEL } from '../../utils/format'

const emptyForm = { name: '', description: '', size: '1-50', type: 'Công ty TNHH', province: '', district: '', address_detail: '', website: '', phone: '', logo_url: '' }

const URL_RE = /^https?:\/\/.+\..+/
const PHONE_RE = /^(0[3|5|7|8|9])[0-9]{8}$/

const validate = (form) => {
  const errs = {}
  if (!form.name.trim()) errs.name = 'Tên công ty không được để trống'
  else if (form.name.trim().length < 2) errs.name = 'Tên công ty phải có ít nhất 2 ký tự'
  else if (form.name.trim().length > 200) errs.name = 'Tên công ty không được quá 200 ký tự'
  if (form.description.length > 2000) errs.description = 'Mô tả không được quá 2000 ký tự'
  if (form.website && !URL_RE.test(form.website)) errs.website = 'Website không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'
  if (form.phone && !PHONE_RE.test(form.phone)) errs.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03/05/07/08/09)'
  if (form.logo_url && !URL_RE.test(form.logo_url)) errs.logo_url = 'URL logo không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'
  return errs
}


const RecruiterCompaniesPage = () => {
  const toast = useToast()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    companiesApi.myCompany()
      .then((data) => {
        if (data) {
          setCompany(data)
        } else {
          setEditing(true)
        }
      })
      .catch(() => setEditing(true))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => {
    setForm({
      name: company.name || '',
      description: company.description || '',
      size: company.size || '1-50',
      type: company.type || 'Công ty TNHH',
      province: company.province || '',
      district: company.district || '',
      address_detail: company.address_detail || '',
      website: company.website || '',
      phone: company.phone || '',
      logo_url: company.logo_url || '',
    })
    setErrors({})
    setEditing(true)
  }

  const cancelEdit = () => {
    setErrors({})
    setEditing(false)
  }

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const setLoc = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      let saved
      if (company) {
        saved = await companiesApi.update(company.id, form)
        toast.success('Đã cập nhật thông tin công ty')
      } else {
        saved = await companiesApi.create(form)
        toast.success('Đã tạo công ty thành công')
      }
      setCompany(saved)
      setEditing(false)
    } catch (err) {
      toast.error(err.message || 'Không thể lưu thông tin công ty')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container" style={{ padding: '64px 0' }}><Spinner /></div>

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head" style={{ marginBottom: 28 }}>
        <div>
          <h1>Quản lý thông tin công ty</h1>
          <p className="text-secondary mb-0">Quản lý thông tin công ty để đăng tin tuyển dụng</p>
        </div>
        {company && !editing && (
          <button className="btn btn-primary" onClick={startEdit}>
            <Icon name="pencil" size={14} />Chỉnh sửa
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {company && !editing && (
        <>
          <div className="profile-card">
            <div className="profile-card-title">
              <span className="profile-card-icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                <Icon name="building" size={16} />
              </span>
              Thông tin công ty
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <CompanyLogo company={company} size={72} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>{company.name}</div>
                <div className="row gap-sm" style={{ flexWrap: 'wrap' }}>
                  {company.size && <span className="badge badge-primary">{LABEL[company.size] || company.size}</span>}
                  {company.type && <span className="badge badge-neutral">{company.type}</span>}
                </div>
              </div>
            </div>
            <div className="info-grid">
              <div className="info-field">
                <span className="info-label">Tên công ty</span>
                <span className="info-value">{company.name || '—'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Loại hình doanh nghiệp</span>
                <span className="info-value">{company.type || '—'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Quy mô nhân sự</span>
                <span className="info-value">{LABEL[company.size] || company.size || '—'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Địa chỉ</span>
                <span className="info-value">{company.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-card-title">
              <span className="profile-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <Icon name="globe" size={16} />
              </span>
              Thông tin liên hệ
            </div>
            <div className="info-grid">
              <div className="info-field">
                <span className="info-label">Số điện thoại</span>
                <span className="info-value">{company.phone || '—'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Website</span>
                <span className="info-value">
                  {company.website
                    ? <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{company.website}</a>
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-card-title">
              <span className="profile-card-icon" style={{ background: '#EEE4F7', color: '#7849B8' }}>
                <Icon name="document" size={16} />
              </span>
              Mô tả công ty
            </div>
            <p style={{ fontSize: 'var(--text-base)', color: company.description ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {company.description || 'Chưa có mô tả — hãy thêm mô tả để ứng viên hiểu hơn về công ty của bạn.'}
            </p>
          </div>
        </>
      )}

      {/* EDIT / CREATE MODE */}
      {editing && (
        <div className="profile-card">
          <div className="form-grid">

            <div className="field full">
              <label>Tên công ty <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                className={`input${errors.name ? ' input-error' : ''}`}
                placeholder="Nhập tên công ty..."
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="field">
              <label>Quy mô nhân sự</label>
              <select className="select" value={form.size} onChange={(e) => setField('size', e.target.value)}>
                <option value="1-50">1–50 nhân viên</option>
                <option value="51-200">51–200 nhân viên</option>
                <option value="201-500">201–500 nhân viên</option>
                <option value="500+">Trên 500 nhân viên</option>
              </select>
            </div>

            <div className="field">
              <label>Loại hình doanh nghiệp</label>
              <select className="select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option>Công ty TNHH</option>
                <option>Công ty Cổ phần</option>
                <option>Doanh nghiệp tư nhân</option>
                <option>Công ty Nhà nước</option>
                <option>Tập đoàn</option>
                <option>Startup</option>
              </select>
            </div>

            <div className="field">
              <label>Website</label>
              <input
                className={`input${errors.website ? ' input-error' : ''}`}
                placeholder="https://..."
                value={form.website}
                onChange={(e) => setField('website', e.target.value)}
              />
              {errors.website && <span className="field-error">{errors.website}</span>}
            </div>

            <div className="field">
              <label>Số điện thoại</label>
              <input
                className={`input${errors.phone ? ' input-error' : ''}`}
                placeholder="0912345678"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            <LocationFields
              province={form.province}
              district={form.district}
              addressDetail={form.address_detail}
              onChange={setLoc}
            />

            <div className="field full">
              <label>URL Logo</label>
              <input
                className={`input${errors.logo_url ? ' input-error' : ''}`}
                placeholder="https://..."
                value={form.logo_url}
                onChange={(e) => setField('logo_url', e.target.value)}
              />
              {errors.logo_url && <span className="field-error">{errors.logo_url}</span>}
            </div>

            <div className="field full">
              <label>Mô tả công ty</label>
              <textarea
                className={`textarea${errors.description ? ' input-error' : ''}`}
                placeholder="Giới thiệu về lĩnh vực hoạt động, văn hóa công ty..."
                rows={4}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: errors.description ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                {form.description.length}/2000
              </span>
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {company && (
              <button className="btn btn-outline" onClick={cancelEdit} disabled={saving}>Hủy</button>
            )}
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Đang lưu...' : company ? <><Icon name="save" size={14} />Lưu thay đổi</> : <><Icon name="plus" size={14} />Tạo công ty</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecruiterCompaniesPage
