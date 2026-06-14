import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import LocationFields from '../components/LocationFields'
import { profileApi } from '../services/api'
import { formatDateVN } from '../utils/format'

const TODAY = new Date().toISOString().split('T')[0]

const ProfileField = ({ label, value, editing, draft, type = 'text', onChange, error, max }) => (
  <div className="info-field">
    <div className="info-label">{label}</div>
    {editing
      ? <>
          <input type={type} className={`input${error ? ' input-error' : ''}`} value={draft || ''} onChange={(e) => onChange(e.target.value)} max={max} />
          {error && <div className="field-error">{error}</div>}
        </>
      : <div className="info-value">{value || <span className="text-muted">—</span>}</div>}
  </div>
)

const ProfileLongField = ({ value, editing, draft, onChange, placeholder }) => (
  editing
    ? <textarea className="textarea" value={draft || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    : value
      ? <p className="info-value" style={{ lineHeight: 1.7, margin: 0 }}>{value}</p>
      : <div className="text-secondary text-sm">{placeholder}</div>
)

const emptyProfile = { full_name: '', phone: '', address: '', province: '', district: '', address_detail: '', dob: '', skills: '', experience: '', education: '', bio: '' }

const validatePhone = (phone) => {
  if (!phone) return null
  if (!/^\d+$/.test(phone)) return 'Số điện thoại chỉ được chứa chữ số'
  if (phone.length !== 10) return 'Số điện thoại phải có đúng 10 chữ số'
  if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) return 'Số điện thoại không hợp lệ'
  return null
}

const ProfilePage = () => {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [phoneError, setPhoneError] = useState(null)

  useEffect(() => {
    let active = true
    profileApi.get()
      .then((data) => { if (active) setProfile(data) })
      .catch(() => { if (active) setProfile(emptyProfile) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const startEdit = () => {
    setDraft({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      province: profile.province || '',
      district: profile.district || '',
      address_detail: profile.address_detail || '',
      dob: profile.dob || '',
      skills: profile.skills || '',
      experience: profile.experience || '',
      education: profile.education || '',
      bio: profile.bio || '',
    })
    setPhoneError(null)
    setEditing(true)
  }
  const cancelEdit = () => { setEditing(false); setPhoneError(null) }
  const updDraft = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }))
    if (k === 'phone') setPhoneError(validatePhone(v))
  }
  const updLoc = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const saveEdit = async () => {
    const err = validatePhone(draft.phone)
    if (err) { setPhoneError(err); return }
    setSaving(true)
    try {
      const payload = { ...draft, dob: draft.dob || null }
      const updated = await profileApi.update(payload)
      setProfile(updated)
      setEditing(false)
      toast.success('Đã lưu thay đổi')
    } catch (err) {
      toast.error(err.message || 'Không thể lưu thay đổi')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="container" style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head">
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p className="text-secondary mb-0">Thông tin hồ sơ của bạn.</p>
        </div>
        <div className="row gap-sm">
          {editing ? (
            <>
              <button className="btn btn-outline" onClick={cancelEdit} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                <Icon name="check" size={14} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={startEdit}><Icon name="pencil" size={14} />Chỉnh sửa</button>
          )}
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-title">
          <span className="profile-card-icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}><Icon name="user" size={16} /></span>
          Thông tin cơ bản
        </div>
        <div className="info-grid">
          <ProfileField label="Họ và tên" value={profile.full_name} editing={editing} draft={draft.full_name} onChange={(v) => updDraft('full_name', v)} />
          <ProfileField label="Số điện thoại" value={profile.phone} editing={editing} draft={draft.phone} onChange={(v) => updDraft('phone', v)} error={phoneError} />
          <ProfileField label="Ngày sinh" value={formatDateVN(profile.dob)} editing={editing} draft={draft.dob} type="date" onChange={(v) => updDraft('dob', v)} max={TODAY} />
          {editing ? (
            <LocationFields
              province={draft.province}
              district={draft.district}
              addressDetail={draft.address_detail}
              onChange={updLoc}
              detailFull={false}
            />
          ) : (
            <ProfileField label="Địa chỉ" value={profile.address} editing={false} />
          )}
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-title">
          <span className="profile-card-icon" style={{ background: '#EEE4F7', color: '#7849B8' }}><Icon name="document" size={16} /></span>
          Giới thiệu bản thân
        </div>
        <ProfileLongField value={profile.bio} editing={editing} draft={draft.bio} onChange={(v) => updDraft('bio', v)} placeholder="Chưa có giới thiệu — hãy chia sẻ về bản thân để nhà tuyển dụng hiểu bạn hơn." />
      </div>

      <div className="profile-card">
        <div className="profile-card-title">
          <span className="profile-card-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}><Icon name="sparkles" size={16} /></span>
          Kỹ năng
        </div>
        {editing ? (
          <textarea className="textarea" value={draft.skills} onChange={(e) => updDraft('skills', e.target.value)} placeholder="VD: Python, React, PostgreSQL..." />
        ) : profile.skills ? (
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {profile.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
              <span key={i} className="badge badge-accent">{s}</span>
            ))}
          </div>
        ) : (
          <div className="text-secondary text-sm">Chưa khai báo kỹ năng.</div>
        )}
      </div>

      <div className="profile-card">
        <div className="profile-card-title">
          <span className="profile-card-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}><Icon name="briefcase" size={16} /></span>
          Kinh nghiệm làm việc
        </div>
        <ProfileLongField value={profile.experience} editing={editing} draft={draft.experience} onChange={(v) => updDraft('experience', v)} placeholder="Mô tả ngắn gọn về kinh nghiệm, dự án đã làm..." />
      </div>

      <div className="profile-card">
        <div className="profile-card-title">
          <span className="profile-card-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}><Icon name="document" size={16} /></span>
          Học vấn
        </div>
        <ProfileLongField value={profile.education} editing={editing} draft={draft.education} onChange={(v) => updDraft('education', v)} placeholder="Trường, chuyên ngành, năm tốt nghiệp..." />
      </div>
    </div>
  )
}

export default ProfilePage
