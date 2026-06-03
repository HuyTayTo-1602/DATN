import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirm: '', role: 'job_seeker' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    try {
      await authApi.register(form.email, form.password, form.role)
      setSuccess('Đăng ký thành công! Đang đăng nhập...')
      // Auto-login
      await login(form.email, form.password)
      navigate(form.role === 'recruiter' ? '/my-jobs' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '2.5rem' }}>🚀</span>
        </div>
        <h1 className="auth-title">Tạo tài khoản</h1>
        <p className="auth-sub">Tham gia JobCV để tìm việc làm mơ ước</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">Tôi là</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { value: 'job_seeker', label: '🔎 Ứng viên', sub: 'Tìm việc làm' },
                { value: 'recruiter', label: '🏢 Nhà tuyển dụng', sub: 'Đăng tuyển' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '14px 10px',
                    border: `2px solid ${form.role === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: form.role === opt.value ? 'var(--primary-bg)' : 'var(--surface)',
                    transition: 'all .15s',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    gap: 4,
                    color: form.role === opt.value ? 'var(--primary-light)' : 'var(--text)',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={form.role === opt.value}
                    onChange={set('role')}
                    style={{ display: 'none' }}
                  />
                  <span>{opt.label}</span>
                  <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {opt.sub}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              className="input"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu</label>
            <input
              className="input"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirm}
              onChange={set('confirm')}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? '⏳ Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-link">
          Đã có tài khoản?{' '}
          <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
