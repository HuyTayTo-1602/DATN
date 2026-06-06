import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi } from '../../services/api'
import JobCard from '../JobCard'

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

function EmptyNoCv() {
  return (
    <div className="empty-jobs" style={{ padding: '32px 24px' }}>
      <div className="empty-jobs-icon">
        <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" />
          <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3>Chưa có CV</h3>
      <p>Upload CV để nhận gợi ý việc làm phù hợp với bạn</p>
      <Link to="/profile" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
        Upload CV ngay →
      </Link>
    </div>
  )
}

function EmptyNotParsed() {
  return (
    <div className="empty-jobs" style={{ padding: '32px 24px' }}>
      <div className="empty-jobs-icon">
        <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" />
          <path d="M32 20v12l8 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3>CV đang được xử lý</h3>
      <p>Hệ thống đang phân tích CV của bạn. Thử lại sau ít phút.</p>
    </div>
  )
}

export default function RecommendedJobsSection() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    jobsApi.recommendations(6)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="section section-jobs">
      <div className="container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Việc làm gợi ý cho bạn</h2>
            <p className="section-sub">Dựa trên kỹ năng và kinh nghiệm trong CV của bạn</p>
          </div>
          <Link to="/jobs?cv_match=1" className="btn btn-secondary btn-sm">Xem tất cả →</Link>
        </div>

        {loading ? (
          <div className="jobs-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="empty-jobs" style={{ padding: '32px 24px' }}>
            <p style={{ color: '#ef4444' }}>Không thể tải gợi ý: {error}</p>
          </div>
        ) : !result?.has_cv ? (
          <EmptyNoCv />
        ) : !result?.cv_parsed ? (
          <EmptyNotParsed />
        ) : result.items.length === 0 ? (
          <div className="empty-jobs" style={{ padding: '32px 24px' }}>
            <h3>Chưa tìm được việc phù hợp</h3>
            <p>Hệ thống chưa tìm được job phù hợp. Hãy thử <Link to="/jobs">tìm kiếm thủ công</Link>.</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {result.items.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </section>
  )
}
