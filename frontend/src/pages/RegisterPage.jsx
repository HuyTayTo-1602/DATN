import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const ROLE_HOME = { job_seeker: '/profile', recruiter: '/recruiter/jobs' }

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('job_seeker')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (!email.includes('@')) { toast.error('Email không hợp lệ'); return }
    if (password.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return }
    if (password !== confirm) { toast.error('Mật khẩu xác nhận không khớp'); return }
    setSubmitting(true)
    try {
      await register(email, password, role)
      const user = await login(email, password)
      toast.success('Tạo tài khoản thành công!')
      navigate(ROLE_HOME[user.role] || '/')
    } catch (err) {
      toast.error(err.message || 'Không thể tạo tài khoản')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="brand" style={{ color: '#fff' }}>
          <span className="brand-mark" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>CB</span>
          CareerBridge
        </div>
        <div>
          <h2>Bắt đầu hành trình mới</h2>
          <p>Tạo tài khoản miễn phí để khám phá hàng nghìn cơ hội việc làm phù hợp — hoặc tuyển dụng những ứng viên xuất sắc nhất.</p>
        </div>
        <div className="auth-quote">
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div style={{ fontSize: '2.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em' }}>500+</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Việc làm mỗi tuần</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 32 }}>
              <div style={{ fontSize: '2.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em' }}>150+</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Công ty uy tín</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 32 }}>
              <div style={{ fontSize: '2.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em' }}>2,000+</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Ứng viên hoạt động</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <h1>Tạo tài khoản</h1>
            <div className="sub">Chỉ mất 2 phút để bắt đầu</div>
          </div>
          <div className="field">
            <label>Tôi là</label>
            <div className="role-select">
              <label className={`role-card ${role === 'job_seeker' ? 'selected' : ''}`}>
                <input type="radio" name="role" checked={role === 'job_seeker'} onChange={() => setRole('job_seeker')} />
                <div className="role-icon"><Icon name="user" size={18} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Ứng viên tìm việc</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tìm và ứng tuyển vào các vị trí</div>
                </div>
              </label>
              <label className={`role-card ${role === 'recruiter' ? 'selected' : ''}`}>
                <input type="radio" name="role" checked={role === 'recruiter'} onChange={() => setRole('recruiter')} />
                <div className="role-icon"><Icon name="building" size={18} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Nhà tuyển dụng</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Đăng tin và tuyển ứng viên</div>
                </div>
              </label>
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" autoComplete="username" />
          </div>
          <div className="field">
            <label>Mật khẩu <span className="text-muted text-xs">(tối thiểu 6 ký tự)</span></label>
            <div className="password-field">
              <input type={showPw ? 'text' : 'password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>
          <div className="field">
            <label>Xác nhận mật khẩu</label>
            <input type={showPw ? 'text' : 'password'} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
          <div className="text-sm" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Đã có tài khoản? <a onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Đăng nhập</a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
