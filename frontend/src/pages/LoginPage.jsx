import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const ROLE_HOME = { job_seeker: '/', recruiter: '/recruiter/jobs', admin: '/admin' }

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (!email.includes('@')) { setError('Email không hợp lệ'); return }
    if (!password) { setError('Vui lòng nhập mật khẩu'); return }
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      toast.success(`Chào mừng trở lại, ${user.email}!`)
      const from = location.state?.from?.pathname
      navigate(from || ROLE_HOME[user.role] || '/')
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
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
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để tiếp tục hành trình sự nghiệp của bạn — kết nối với hàng nghìn nhà tuyển dụng uy tín tại Việt Nam.</p>
        </div>
        <div className="auth-quote">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6 }}>"CareerBridge giúp tôi tìm được công việc mơ ước chỉ sau 2 tuần. Gợi ý việc làm cá nhân hóa cực kỳ chính xác."</p>
          <div className="row" style={{ gap: 10, marginTop: 14, color: '#fff' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>N</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Nguyễn Minh Hà</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Frontend Engineer @ Tiki</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <h1>Đăng nhập</h1>
            <div className="sub">Tiếp tục với tài khoản CareerBridge của bạn</div>
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" autoComplete="username" />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <div className="password-field">
              <input type={showPw ? 'text' : 'password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>
          {error && <div className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</div>}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
          <div className="auth-divider">hoặc</div>
          <div className="text-sm" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Chưa có tài khoản? <a onClick={() => navigate('/register')} style={{ cursor: 'pointer' }}>Đăng ký miễn phí</a>
          </div>
          <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
            Demo: admin@example.com / recruiter@example.com / candidate@example.com — mật khẩu tương ứng *123
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
