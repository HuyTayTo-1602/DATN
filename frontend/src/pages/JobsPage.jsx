import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jobsApi } from '../services/api'
import JobCard from '../components/JobCard'
import Spinner from '../components/Spinner'
import ProvinceSelect from '../components/ProvinceSelect'
const LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Manager']

const SALARY_RANGES = [
  { label: 'Dưới 5 triệu',    min: 0,   max: 5   },
  { label: '5 – 10 triệu',    min: 5,   max: 10  },
  { label: '10 – 15 triệu',   min: 10,  max: 15  },
  { label: '15 – 20 triệu',   min: 15,  max: 20  },
  { label: '20 – 30 triệu',   min: 20,  max: 30  },
  { label: '30 – 50 triệu',   min: 30,  max: 50  },
  { label: 'Trên 50 triệu',   min: 50,  max: null },
]

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [pendingKeyword, setPendingKeyword] = useState(searchParams.get('keyword') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [level, setLevel] = useState(searchParams.get('level') || '')
  const [salaryRange, setSalaryRange] = useState(searchParams.get('salary_range') || '')
  const [companyName, setCompanyName] = useState(searchParams.get('company_name') || '')
  const [onlyActiveDeadline, setOnlyActiveDeadline] = useState(
    searchParams.get('only_active_deadline') === 'true'
  )
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  const [result, setResult] = useState({ items: [], total: 0, page: 1, page_size: 9 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchJobs = useCallback(async (params) => {
    setLoading(true)
    setError('')
    try {
      const data = await jobsApi.list(params)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const range = SALARY_RANGES.find((r) => String(r.min) === salaryRange)
    const params = {
      keyword, location, level,
      salary_min: range ? range.min : undefined,
      salary_max: range?.max ?? undefined,
      company_name: companyName,
      only_active_deadline: onlyActiveDeadline,
      page, page_size: 9,
    }
    fetchJobs(params)

    const sp = {}
    if (keyword) sp.keyword = keyword
    if (location) sp.location = location
    if (level) sp.level = level
    if (salaryRange) sp.salary_range = salaryRange
    if (companyName) sp.company_name = companyName
    if (onlyActiveDeadline) sp.only_active_deadline = 'true'
    if (page > 1) sp.page = page
    setSearchParams(sp, { replace: true })
  }, [keyword, location, level, salaryRange, companyName, onlyActiveDeadline, page, fetchJobs])

  const handleSearch = (e) => {
    e.preventDefault()
    setKeyword(pendingKeyword)
    setPage(1)
  }

  const hasFilters = keyword || pendingKeyword || location || level || salaryRange || companyName || onlyActiveDeadline

  const clearFilters = () => {
    setKeyword('')
    setPendingKeyword('')
    setLocation('')
    setLevel('')
    setSalaryRange('')
    setCompanyName('')
    setOnlyActiveDeadline(false)
    setPage(1)
  }

  const totalPages = Math.ceil(result.total / result.page_size)

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Tìm kiếm việc làm</h1>
          <p>Có <strong>{result.total}</strong> tin tuyển dụng phù hợp</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 28 }}>
        <div className="jobs-layout">
          {/* Sidebar Filter */}
          <aside className="filter-sidebar">
            <div className="filter-title">🔍 Bộ lọc tìm kiếm</div>

            <form onSubmit={handleSearch}>
              <div className="filter-group">
                <label>Từ khóa</label>
                <input
                  className="input"
                  placeholder="Vị trí, kỹ năng, mô tả..."
                  value={pendingKeyword}
                  onChange={(e) => setPendingKeyword(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Địa điểm</label>
                <ProvinceSelect
                  value={location}
                  onChange={(v) => { setLocation(v); setPage(1) }}
                  placeholder="-- Tất cả địa điểm --"
                />
              </div>

              <div className="filter-group">
                <label>Cấp bậc</label>
                <select
                  className="input"
                  value={level}
                  onChange={(e) => { setLevel(e.target.value); setPage(1) }}
                >
                  <option value="">Tất cả cấp bậc</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Mức lương</label>
                <select
                  className="input"
                  value={salaryRange}
                  onChange={(e) => { setSalaryRange(e.target.value); setPage(1) }}
                >
                  <option value="">Tất cả mức lương</option>
                  {SALARY_RANGES.map((r) => (
                    <option key={r.min} value={String(r.min)}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tên công ty</label>
                <input
                  className="input"
                  placeholder="VD: FPT, Viettel..."
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setPage(1) }}
                />
              </div>

              <div className="filter-group">
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}
                >
                  <input
                    type="checkbox"
                    checked={onlyActiveDeadline}
                    onChange={(e) => { setOnlyActiveDeadline(e.target.checked); setPage(1) }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  Còn hạn nộp hồ sơ
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                Tìm kiếm
              </button>

              {hasFilters && (
                <button
                  type="button"
                  className="btn btn-ghost btn-full mt-2"
                  onClick={clearFilters}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
          </aside>

          {/* Job List */}
          <div>
            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
              <Spinner />
            ) : result.items.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <h3>Không tìm thấy kết quả</h3>
                <p>Thử thay đổi từ khóa hoặc xóa bộ lọc để xem thêm việc làm</p>
              </div>
            ) : (
              <>
                <div className="jobs-grid">
                  {result.items.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="page-btn"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                        ) : (
                          <button
                            key={p}
                            className={`page-btn ${p === page ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )}

                    <button
                      className="page-btn"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
