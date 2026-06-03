import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../services/api'
import JobCard from '../components/JobCard'

function useCountUp(end, duration = 1300) {
  const [value, setValue] = useState(0)
  const [triggered, setTriggered] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTriggered(true); obs.disconnect() } },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * end))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [triggered, end, duration])

  return [value, ref]
}

function StatItem({ end, format, label }) {
  const [count, ref] = useCountUp(end)
  return (
    <div className="hero-stat" ref={ref}>
      <strong>{format(count)}</strong>
      <span>{label}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skel skel-logo" />
        <div style={{ flex: 1 }}>
          <div className="skel skel-title" />
          <div className="skel skel-sub" />
        </div>
      </div>
      <div className="skel skel-line" />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <div className="skel skel-badge" />
        <div className="skel skel-badge" />
        <div className="skel skel-badge" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    jobsApi.list({ page_size: 6 })
      .then((data) => setJobs(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/jobs${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-dot-pattern" />
        <div className="container hero-content">
          <div className="hero-eyebrow">✦ Nền tảng tuyển dụng hàng đầu</div>
          <h1>
            Tìm việc làm<br />
            <span className="hero-highlight">phù hợp với bạn</span>
          </h1>
          <p>Hàng nghìn cơ hội việc làm từ các công ty hàng đầu<br />đang chờ đợi bạn!</p>

          <form className="hero-search" onSubmit={handleSearch}>
            <span className="hero-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm việc làm, kỹ năng, công ty..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className="hero-stats">
            <StatItem end={1200} format={(n) => `${n.toLocaleString()}+`} label="Việc làm" />
            <div className="stat-divider" />
            <StatItem end={500} format={(n) => `${n}+`} label="Công ty" />
            <div className="stat-divider" />
            <StatItem end={50} format={(n) => `${n}K+`} label="Ứng viên" />
          </div>
        </div>
      </section>

      {/* Recent Jobs */}
      <section className="section section-jobs">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Việc làm mới nhất</h2>
              <p className="section-sub">Các tin tuyển dụng mới nhất được cập nhật hàng ngày</p>
            </div>
            <a href="/jobs" className="btn btn-secondary btn-sm">Xem tất cả →</a>
          </div>

          {loading ? (
            <div className="jobs-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-jobs">
              <div className="empty-jobs-icon">
                <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="18" width="48" height="34" rx="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" />
                  <path d="M22 18V13a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="32" cy="35" r="7" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M32 31v4l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Chưa có tin tuyển dụng</h3>
              <p>Hệ thống chưa có dữ liệu. Nhà tuyển dụng có thể đăng tin ngay!</p>
              <a href="/register" className="btn btn-primary btn-sm" style={{ marginTop: 20, display: 'inline-flex' }}>
                Đăng tin ngay
              </a>
            </div>
          ) : (
            <div className="jobs-grid">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container cta-inner">
          <div className="cta-icons">
            <div className="cta-icon-bubble cta-icon-bubble--sm">💼</div>
            <div className="cta-icon-bubble">🚀</div>
            <div className="cta-icon-bubble cta-icon-bubble--sm">👥</div>
          </div>
          <h2>Bạn là nhà tuyển dụng?</h2>
          <p>Đăng tin tuyển dụng và tiếp cận hàng nghìn ứng viên tiềm năng</p>
          <div className="cta-features">
            <span>✓ Miễn phí đăng ký</span>
            <span>✓ Dễ dàng quản lý</span>
            <span>✓ Tiếp cận 50K+ ứng viên</span>
          </div>
          <a href="/register" className="btn btn-primary btn-lg cta-btn">
            Đăng ký miễn phí →
          </a>
        </div>
      </section>
    </div>
  )
}
