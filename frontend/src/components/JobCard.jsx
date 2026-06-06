import { Link } from 'react-router-dom'
import { useState } from 'react'

const levelColor = {
  Junior: 'badge-green',
  Mid: 'badge-blue',
  Senior: 'badge-orange',
  Manager: 'badge-purple',
}

function CompanyLogo({ company }) {
  const [imgError, setImgError] = useState(false)
  const letter = (company?.name || '?').charAt(0).toUpperCase()

  if (company?.logo_url && !imgError) {
    return (
      <div className="company-logo">
        <img
          src={company.logo_url}
          alt={company.name}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  return <div className="company-logo">{letter}</div>
}

export default function JobCard({ job }) {
  const deadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString('vi-VN')
    : null

  return (
    <Link to={`/jobs/${job.id}`} className="card job-card">
      <div className="job-card-header">
        <CompanyLogo company={job.company} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="job-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.title}
          </div>
          <div className="job-card-company">
            {job.company?.name || 'Công ty chưa cập nhật'}
          </div>
        </div>
      </div>

      <div className="job-card-meta">
        {job.location && (
          <span className="badge badge-gray">📍 {job.location}</span>
        )}
        {job.salary && (
          <span className="badge badge-green">💰 {job.salary} triệu đồng</span>
        )}
        {job.level && (
          <span className={`badge ${levelColor[job.level] || 'badge-gray'}`}>
            {job.level}
          </span>
        )}
        {deadline && (
          <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>
            🗓 {deadline}
          </span>
        )}
      </div>
    </Link>
  )
}
