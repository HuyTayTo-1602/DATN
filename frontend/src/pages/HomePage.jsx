import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import JobCard from '../components/jobs/JobCard'
import { CompanyLogo } from '../components/Avatar'
import { SkeletonJobCard } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { jobsApi } from '../services/api'
import { LABEL } from '../utils/format'

const HomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [featured, setFeatured] = useState([])
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [recoLoading, setRecoLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    jobsApi.list({ only_active_deadline: true, page: 1, page_size: 8 })
      .then((data) => { if (active) setFeatured(data?.items || []) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (role !== 'job_seeker') return
    let active = true
    setRecoLoading(true)
    jobsApi.recommendations(3)
      .then((data) => { if (active) setRecommended(data?.items || []) })
      .catch(() => {})
      .finally(() => { if (active) setRecoLoading(false) })
    return () => { active = false }
  }, [role])

  // Unique companies derived from featured jobs (no public companies-list endpoint)
  const companies = []
  const seen = new Set()
  for (const j of featured) {
    if (j.company && !seen.has(j.company.id)) {
      seen.add(j.company.id)
      companies.push(j.company)
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    navigate(keyword ? `/jobs?keyword=${encodeURIComponent(keyword)}` : '/jobs')
  }

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">Tìm việc làm <span style={{ color: 'var(--color-primary)' }}>phù hợp</span> với bạn</h1>
          <p className="hero-sub">Hàng nghìn cơ hội từ các công ty hàng đầu — được gợi ý dựa trên kỹ năng và CV của bạn</p>
          <form className="hero-search" onSubmit={submitSearch}>
            <div className="input-icon" style={{ flex: 1 }}>
              <Icon name="search" size={18} />
              <input className="input" placeholder="Tên việc, kỹ năng, công ty..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg">
              <Icon name="search" size={16} />Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 48 }}>
        <div className="container">
          <div className="trust-strip">
            <div className="trust-eyebrow">
              <span className="trust-dot"></span>
              MẠNG LƯỚI CAREERBRIDGE
            </div>
            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-num">500<span className="trust-plus">+</span></div>
                <div className="trust-label">Việc làm đang tuyển</div>
                <div className="trust-meta"><Icon name="arrow-up" size={11} />Cập nhật mỗi ngày</div>
              </div>
              <div className="trust-sep"></div>
              <div className="trust-item">
                <div className="trust-num">150<span className="trust-plus">+</span></div>
                <div className="trust-label">Công ty uy tín</div>
                <div className="trust-meta">Đa dạng lĩnh vực trên cả nước</div>
              </div>
              <div className="trust-sep"></div>
              <div className="trust-item">
                <div className="trust-num">2,000<span className="trust-plus">+</span></div>
                <div className="trust-label">Ứng viên hoạt động</div>
                <div className="trust-meta"><Icon name="arrow-up" size={11} />Kết nối mỗi ngày</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isAuthenticated && role === 'job_seeker' && (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 48 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Việc làm phù hợp với bạn</h2>
                <p>Dựa trên CV và kỹ năng đã khai báo</p>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate('/recommendations')}>
                Xem tất cả <Icon name="arrow-right" size={14} />
              </button>
            </div>
            {recoLoading ? (
              <div className="job-grid">{[1, 2, 3].map((i) => <SkeletonJobCard key={i} />)}</div>
            ) : recommended.length === 0 ? (
              <div className="card text-secondary text-sm" style={{ textAlign: 'center', padding: 32 }}>
                Chưa có gợi ý — hãy hoàn thiện hồ sơ và tải lên CV để nhận gợi ý phù hợp.
              </div>
            ) : (
              <div className="job-grid">
                {recommended.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Việc làm nổi bật</h2>
              <p>Cơ hội mới nhất từ các nhà tuyển dụng hàng đầu</p>
            </div>
            <button className="btn btn-outline" onClick={() => navigate('/jobs')}>
              Xem tất cả <Icon name="arrow-right" size={14} />
            </button>
          </div>
          {loading ? (
            <div className="job-grid">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonJobCard key={i} />)}</div>
          ) : featured.length === 0 ? (
            <div className="card text-secondary text-sm" style={{ textAlign: 'center', padding: 32 }}>Chưa có tin tuyển dụng nào.</div>
          ) : (
            <div className="job-grid">
              {featured.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )}
        </div>
      </section>

      {companies.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Công ty hàng đầu</h2>
                <p>Khám phá môi trường làm việc và cơ hội từ các thương hiệu lớn</p>
              </div>
              <button className="btn btn-outline" onClick={() => navigate('/companies')}>
                Xem tất cả <Icon name="arrow-right" size={14} />
              </button>
            </div>
            <div className="job-grid">
              {companies.slice(0, 6).map((c) => (
                <Link key={c.id} to={`/companies/${c.id}`} className="job-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="job-card-head">
                    <CompanyLogo company={c} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      {LABEL[c.size] && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{LABEL[c.size]}</div>
                      )}
                    </div>
                  </div>
                  {c.address && (
                    <div className="job-pills">
                      <span className="pill">
                        <Icon name="map-pin" size={11} />
                        {c.address}
                      </span>
                    </div>
                  )}
                  <div className="job-card-foot">
                    <span className="pill" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      Xem công ty <Icon name="arrow-right" size={11} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default HomePage
