import { useState, useEffect } from 'react'
import { profileApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import CvUploadCard from '../components/CvUploadCard'

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  address: '',
  dob: '',
  skills: '',
  experience: '',
  education: '',
  bio: '',
}

const REQUIRED = {
  full_name: 'Họ và tên',
  phone: 'Số điện thoại',
  dob: 'Ngày sinh',
  address: 'Địa chỉ',
  bio: 'Giới thiệu bản thân',
  skills: 'Kỹ năng',
  experience: 'Kinh nghiệm làm việc',
  education: 'Học vấn',
}

function InfoRow({ label, value, multiline }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      {multiline ? (
        <div style={{ color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: '0.9375rem' }}>
          {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cập nhật</span>}
        </div>
      ) : (
        <div style={{ color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 500 }}>
          {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cập nhật</span>}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [savedData, setSavedData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    profileApi.get()
      .then((data) => {
        if (!data) {
          setIsNew(true)
          setEditing(true)
          return
        }
        const filled = {
          full_name:  data.full_name  ?? '',
          phone:      data.phone      ?? '',
          address:    data.address    ?? '',
          dob:        data.dob        ?? '',
          skills:     data.skills     ?? '',
          experience: data.experience ?? '',
          education:  data.education  ?? '',
          bio:        data.bio        ?? '',
        }
        setSavedData(filled)
        setForm(filled)
      })
      .catch((err) => setMsg({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (msg.text) setMsg({ type: '', text: '' })
  }

  const handleEdit = () => {
    setForm(savedData || EMPTY_FORM)
    setMsg({ type: '', text: '' })
    setEditing(true)
  }

  const handleCancel = () => {
    setForm(savedData || EMPTY_FORM)
    setMsg({ type: '', text: '' })
    setEditing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ type: '', text: '' })

    for (const [field, label] of Object.entries(REQUIRED)) {
      if (!form[field].trim()) {
        setMsg({ type: 'error', text: `Vui lòng điền "${label}"` })
        setSaving(false)
        return
      }
    }

    const payload = {}
    for (const [key, val] of Object.entries(form)) {
      if (val.trim() !== '') payload[key] = val
    }

    try {
      await profileApi.update(payload)
      setSavedData({ ...form })
      setIsNew(false)
      setEditing(false)
      setMsg({ type: 'success', text: '✅ Lưu hồ sơ thành công!' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.role !== 'job_seeker') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho ứng viên.
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  const formatDob = (dob) => {
    if (!dob) return ''
    const d = new Date(dob)
    return isNaN(d) ? dob : d.toLocaleDateString('vi-VN')
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Hồ sơ cá nhân</h1>
          <p>
            {isNew
              ? '👋 Chào mừng! Hãy điền thông tin để hoàn thiện hồ sơ của bạn.'
              : editing
              ? 'Chỉnh sửa thông tin hồ sơ của bạn.'
              : 'Thông tin hồ sơ của bạn.'}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 20px', maxWidth: 800 }}>
        {/* CV Management – luôn hiển thị, CV là bắt buộc để ứng tuyển */}
        <CvUploadCard />
        {msg.text && (
          <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>
            {msg.text}
          </div>
        )}

        {/* ── VIEW MODE ── */}
        {!editing && savedData && (
          <div>
            {/* Header hành động */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={handleEdit}>
                ✏️ Chỉnh sửa hồ sơ
              </button>
            </div>

            {/* Thông tin cơ bản */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>👤 Thông tin cơ bản</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                <InfoRow label="Họ và tên" value={savedData.full_name} />
                <InfoRow label="Số điện thoại" value={savedData.phone} />
                <InfoRow label="Ngày sinh" value={formatDob(savedData.dob)} />
                <InfoRow label="Địa chỉ" value={savedData.address} />
              </div>
            </div>

            {/* Giới thiệu */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>📝 Giới thiệu bản thân</h3>
              <InfoRow label="" value={savedData.bio} multiline />
            </div>

            {/* Kỹ năng */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>💡 Kỹ năng</h3>
              <InfoRow label="" value={savedData.skills} multiline />
            </div>

            {/* Kinh nghiệm */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>💼 Kinh nghiệm làm việc</h3>
              <InfoRow label="" value={savedData.experience} multiline />
            </div>

            {/* Học vấn */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>🎓 Học vấn</h3>
              <InfoRow label="" value={savedData.education} multiline />
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {editing && (
          <form onSubmit={handleSubmit}>
            {/* Thông tin cơ bản */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>👤 Thông tin cơ bản</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Họ và tên <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="input"
                    placeholder="Nguyễn Văn A"
                    value={form.full_name}
                    onChange={set('full_name')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="0901 234 567"
                    value={form.phone}
                    onChange={set('phone')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày sinh <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="input"
                    type="date"
                    value={form.dob}
                    onChange={set('dob')}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="input"
                    placeholder="TP.HCM, Hà Nội..."
                    value={form.address}
                    onChange={set('address')}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Giới thiệu */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>📝 Giới thiệu bản thân <span style={{ color: 'var(--danger)' }}>*</span></h3>
              <div className="form-group">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Mô tả ngắn gọn về bản thân, mục tiêu nghề nghiệp..."
                  value={form.bio}
                  onChange={set('bio')}
                  style={{ resize: 'vertical' }}
                  required
                />
                <div className="form-hint">Tối đa vài câu ngắn gọn, súc tích.</div>
              </div>
            </div>

            {/* Kỹ năng */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>💡 Kỹ năng <span style={{ color: 'var(--danger)' }}>*</span></h3>
              <div className="form-group">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Python, React, Docker, Photoshop, Microsoft Office..."
                  value={form.skills}
                  onChange={set('skills')}
                  style={{ resize: 'vertical' }}
                  required
                />
                <div className="form-hint">Liệt kê các kỹ năng, phân cách bằng dấu phẩy.</div>
              </div>
            </div>

            {/* Kinh nghiệm */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>💼 Kinh nghiệm làm việc <span style={{ color: 'var(--danger)' }}>*</span></h3>
              <div className="form-group">
                <textarea
                  className="input"
                  rows={5}
                  placeholder="2022–2024: Frontend Developer tại Công ty ABC&#10;- Phát triển giao diện React&#10;- Tối ưu hiệu suất web..."
                  value={form.experience}
                  onChange={set('experience')}
                  style={{ resize: 'vertical' }}
                  required
                />
                <div className="form-hint">Liệt kê kinh nghiệm theo thứ tự từ mới nhất.</div>
              </div>
            </div>

            {/* Học vấn */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>🎓 Học vấn <span style={{ color: 'var(--danger)' }}>*</span></h3>
              <div className="form-group">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="2019–2023: Đại học Bách Khoa TP.HCM&#10;Ngành: Công nghệ Thông tin&#10;GPA: 3.5/4.0"
                  value={form.education}
                  onChange={set('education')}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            {/* Nút lưu */}
            <div className="flex gap-3" style={{ alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? '⏳ Đang lưu...' : isNew ? '🚀 Tạo hồ sơ' : '💾 Lưu thay đổi'}
              </button>
              {!isNew && (
                <button type="button" className="btn btn-ghost btn-lg" onClick={handleCancel}>
                  Hủy
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const sectionStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 28,
  marginBottom: 20,
}

const sectionTitleStyle = {
  fontWeight: 700,
  fontSize: '1rem',
  color: 'var(--text)',
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: '1px solid var(--border)',
}
