import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { CompanyLogo } from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import { jobsApi } from '../services/api'
import { LABEL } from '../utils/format'

const PAGE_SIZE = 12

// No public companies-list endpoint — derive a directory by aggregating unique
// companies from the active job listings (collected across several pages).
const CompaniesPage = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [jobCounts, setJobCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    const fetchPages = async () => {
      const seen = new Map()
      const counts = {}
      let p = 1
      let total = Infinity
      while (active && (p - 1) * 50 < total && p <= 6) {
        const data = await jobsApi.list({ only_active_deadline: true, page: p, page_size: 50 })
        total = data?.total ?? 0
        for (const j of data?.items || []) {
          if (j.company) {
            if (!seen.has(j.company.id)) seen.set(j.company.id, j.company)
            counts[j.company.id] = (counts[j.company.id] || 0) + 1
          }
        }
        p += 1
      }
      if (active) {
        setCompanies(Array.from(seen.values()))
        setJobCounts(counts)
      }
    }
    fetchPages().catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return companies
    const k = query.trim().toLowerCase()
    return companies.filter((c) => (c.name || '').toLowerCase().includes(k) || (c.address || '').toLowerCase().includes(k))
  }, [companies, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const triggerSearch = () => {
    setQuery(keyword)
    setPage(1)
  }

  return (
    <div className="container">
      <div className="section-head" style={{ marginTop: 24 }}>
        <div>
          <h1>Khám phá công ty</h1>
          <p>Danh sách công ty đang có tin tuyển dụng trên CareerBridge</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          className="input"
          style={{ flex: 1, fontSize: 'var(--text-base)', height: 48 }}
          placeholder="Tìm theo tên công ty hoặc địa điểm..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
        />
        <button
          className="btn btn-primary"
          style={{ height: 48, padding: '0 24px', flexShrink: 0 }}
          onClick={triggerSearch}
        >
          <Icon name="search" size={16} />Tìm kiếm
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState icon="building" title="Không tìm thấy công ty phù hợp" description="Thử một từ khóa khác hoặc quay lại sau." />
      ) : (
        <>
          <div className="jobs-toolbar">
            <div className="jobs-count">Tìm thấy <strong>{filtered.length}</strong> công ty</div>
          </div>
          <div className="company-grid">
            {visible.map((c) => (
              <article className="company-card" key={c.id} onClick={() => navigate(`/companies/${c.id}`)}>
                <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <CompanyLogo company={c} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="company-card-name">{c.name}</h3>
                  </div>
                </div>
                {c.description && <p className="company-card-desc">{c.description}</p>}
                <div className="company-card-meta">
                  {c.address && <span className="job-meta-item"><Icon name="map-pin" size={13} />{c.address}</span>}
                  {c.size && <span className="job-meta-item"><Icon name="users" size={13} />{LABEL[c.size] || c.size}</span>}
                </div>
                <div className="company-card-foot">
                  {jobCounts[c.id] > 0 ? (
                    <span className="badge badge-primary"><Icon name="briefcase" size={11} />{jobCounts[c.id]} vị trí đang tuyển</span>
                  ) : (
                    <span className="badge badge-neutral">Chưa có tin tuyển dụng</span>
                  )}
                  <span className="text-sm" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    Xem chi tiết <Icon name="arrow-right" size={12} style={{ verticalAlign: '-2px' }} />
                  </span>
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} withGoto />}
        </>
      )}
    </div>
  )
}

export default CompaniesPage
