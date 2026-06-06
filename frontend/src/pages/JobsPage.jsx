import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jobsApi } from '../services/api'
import JobCard from '../components/JobCard'
import Spinner from '../components/Spinner'
import ProvinceSelect from '../components/ProvinceSelect'
import { useAuth } from '../context/AuthContext'
const LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Manager']

function extractSalaryBounds(salaryStr) {
  if (!salaryStr) return { lower: null, upper: null }
  const nums = String(salaryStr).match(/\d+/g)
  if (!nums || nums.length === 0) return { lower: null, upper: null }
  return { lower: parseInt(nums[0]), upper: parseInt(nums[nums.length - 1]) }
}

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
  const { user } = useAuth()
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

  const [result, setResult] = useState({ items: [], total: 0, page: 1, page_size: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── CV Match mode ──────────────────────────────────────────
  // Khởi tạo từ URL param ?cv_match=1 (được truyền từ trang chủ)
  const [cvMatchMode, setCvMatchMode] = useState(searchParams.get('cv_match') === '1')
  const [cvMatchResult, setCvMatchResult] = useState(null)
  const [cvMatchLoading, setCvMatchLoading] = useState(false)
  const [cvMatchError, setCvMatchError] = useState('')

  const fetchCvMatch = useCallback(async () => {
    setCvMatchLoading(true)
    setCvMatchError('')
    try {
      const data = await jobsApi.recommendations(30)
      setCvMatchResult(data)
    } catch (err) {
      setCvMatchError(err.message)
    } finally {
      setCvMatchLoading(false)
    }
  }, [])

  // Tự động fetch khi vào trang với ?cv_match=1, đồng thời clean URL
  useEffect(() => {
    if (searchParams.get('cv_match') === '1') {
      fetchCvMatch()
      const sp = new URLSearchParams(searchParams)
      sp.delete('cv_match')
      setSearchParams(sp, { replace: true })
    }
  }, [fetchCvMatch]) // fetchCvMatch stable — chỉ chạy 1 lần lúc mount

  const toggleCvMatch = () => {
    if (!cvMatchMode) {
      setCvMatchMode(true)
      fetchCvMatch()
    } else {
      setCvMatchMode(false)
      setCvMatchResult(null)
    }
  }

  // Kết quả CV match đã được lọc thêm bởi các bộ lọc hiện tại (client-side)
  const filteredCvItems = useMemo(() => {
    if (!cvMatchResult?.items) return []
    let items = cvMatchResult.items

    if (keyword) {
      const kw = keyword.toLowerCase()
      items = items.filter(job =>
        (job.title || '').toLowerCase().includes(kw) ||
        (job.description || '').toLowerCase().includes(kw) ||
        (job.requirements || '').toLowerCase().includes(kw) ||
        (job.benefits || '').toLowerCase().includes(kw)
      )
    }
    if (location) {
      const loc = location.toLowerCase()
      items = items.filter(job => (job.location || '').toLowerCase().includes(loc))
    }
    if (level) {
      items = items.filter(job => job.level === level)
    }
    if (salaryRange) {
      const range = SALARY_RANGES.find(r => String(r.min) === salaryRange)
      if (range) {
        items = items.filter(job => {
          const { lower, upper } = extractSalaryBounds(job.salary)
          if (lower === null && upper === null) return false
          if (range.min != null && upper !== null && upper < range.min) return false
          if (range.max != null && lower !== null && lower > range.max) return false
          return true
        })
      }
    }
    if (companyName) {
      const cn = companyName.toLowerCase()
      items = items.filter(job => (job.company?.name || '').toLowerCase().includes(cn))
    }
    if (onlyActiveDeadline) {
      const today = new Date().toISOString().split('T')[0]
      items = items.filter(job => !job.deadline || job.deadline >= today)
    }
    return items
  }, [cvMatchResult, keyword, location, level, salaryRange, companyName, onlyActiveDeadline])

  // Phân trang cho CV match mode (client-side)
  const CV_PAGE_SIZE = 10
  const [cvPage, setCvPage] = useState(1)

  // Reset về trang 1 khi kết quả lọc thay đổi
  useEffect(() => {
    setCvPage(1)
  }, [filteredCvItems])

  const cvTotalPages = Math.ceil(filteredCvItems.length / CV_PAGE_SIZE)
  const paginatedCvItems = useMemo(() => {
    const start = (cvPage - 1) * CV_PAGE_SIZE
    return filteredCvItems.slice(start, start + CV_PAGE_SIZE)
  }, [filteredCvItems, cvPage])
  // ──────────────────────────────────────────────────────────

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
    if (cvMatchMode) return

    const range = SALARY_RANGES.find((r) => String(r.min) === salaryRange)
    const params = {
      keyword, location, level,
      salary_min: range ? range.min : undefined,
      salary_max: range?.max ?? undefined,
      company_name: companyName,
      only_active_deadline: onlyActiveDeadline,
      page, page_size: 10,
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
  }, [keyword, location, level, salaryRange, companyName, onlyActiveDeadline, page, fetchJobs, cvMatchMode])

  const exitCvMatch = () => {
    setCvMatchMode(false)
    setCvMatchResult(null)
  }

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

            {/* Nút CV Match — chỉ hiện với ứng viên đã đăng nhập */}
            {user?.role === 'job_seeker' && (
              <button
                type="button"
                onClick={toggleCvMatch}
                style={{
                  width: '100%',
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: cvMatchMode ? '2px solid var(--primary)' : '2px solid var(--border)',
                  background: cvMatchMode ? 'var(--primary-bg)' : 'transparent',
                  color: cvMatchMode ? 'var(--primary-light)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: '1rem' }}>✨</span>
                {cvMatchMode ? 'Đang lọc theo CV của bạn' : 'Việc làm phù hợp với CV'}
                {cvMatchMode && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: .7 }}>Tắt ✕</span>
                )}
              </button>
            )}

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
            {/* ── CV Match mode ── */}
            {cvMatchMode ? (
              <>
                {cvMatchLoading && <Spinner />}
                {cvMatchError && <div className="alert alert-error">{cvMatchError}</div>}
                {!cvMatchLoading && !cvMatchError && cvMatchResult && (
                  <>
                    {/* Header context */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 18, padding: '10px 14px',
                      background: 'var(--surface)', borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>✨</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {cvMatchResult.has_cv === false ? (
                          <>Bạn chưa upload CV. <a href="/profile" style={{ color: 'var(--primary-light)' }}>Upload CV ngay →</a></>
                        ) : cvMatchResult.cv_parsed === false ? (
                          'CV đang được xử lý, vui lòng thử lại sau.'
                        ) : filteredCvItems.length < cvMatchResult.total ? (
                          <>
                            Hiển thị <strong style={{ color: 'var(--primary-light)' }}>{filteredCvItems.length}</strong>
                            {' '}/ {cvMatchResult.total} việc làm phù hợp với CV sau khi lọc
                          </>
                        ) : (
                          <>
                            Tìm thấy <strong style={{ color: 'var(--primary-light)' }}>{cvMatchResult.total}</strong> việc làm phù hợp với CV của bạn
                          </>
                        )}
                      </span>
                    </div>

                    {/* Empty — no CV */}
                    {cvMatchResult.has_cv === false && (
                      <div className="empty">
                        <div className="empty-icon">📄</div>
                        <h3>Chưa có CV</h3>
                        <p>Upload CV để hệ thống gợi ý việc làm phù hợp với bạn</p>
                        <a href="/profile" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
                          Upload CV ngay →
                        </a>
                      </div>
                    )}

                    {/* Empty — CV not parsed */}
                    {cvMatchResult.has_cv && !cvMatchResult.cv_parsed && (
                      <div className="empty">
                        <div className="empty-icon">⏳</div>
                        <h3>CV đang được xử lý</h3>
                        <p>Hệ thống đang phân tích CV của bạn, vui lòng thử lại sau ít phút.</p>
                      </div>
                    )}

                    {/* Empty — no matches after CV match */}
                    {cvMatchResult.has_cv && cvMatchResult.cv_parsed && cvMatchResult.items.length === 0 && (
                      <div className="empty">
                        <div className="empty-icon">🔍</div>
                        <h3>Chưa tìm được kết quả phù hợp</h3>
                        <p>Thử <a href="/jobs" style={{ color: 'var(--primary-light)' }}>tìm kiếm thủ công</a> để xem thêm việc làm.</p>
                      </div>
                    )}

                    {/* Empty — filters removed all results */}
                    {cvMatchResult.has_cv && cvMatchResult.cv_parsed && cvMatchResult.items.length > 0 && filteredCvItems.length === 0 && (
                      <div className="empty">
                        <div className="empty-icon">🔍</div>
                        <h3>Không có kết quả phù hợp với bộ lọc</h3>
                        <p>Thử thay đổi bộ lọc địa điểm, cấp bậc hoặc mức lương để xem thêm việc làm phù hợp với CV.</p>
                      </div>
                    )}

                    {/* Results */}
                    {paginatedCvItems.length > 0 && (
                      <>
                        <div className="jobs-grid">
                          {paginatedCvItems.map((job) => (
                            <div key={job.id}>
                              <JobCard job={job} />
                              {job.match_reason && (
                                <div style={{
                                  marginTop: -8, marginBottom: 16,
                                  padding: '6px 12px',
                                  background: 'var(--surface)',
                                  borderRadius: '0 0 10px 10px',
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted)',
                                  borderTop: '1px solid var(--border)',
                                }}>
                                  ✨ {job.match_reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {cvTotalPages > 1 && (
                          <div className="pagination">
                            <button
                              className="page-btn"
                              disabled={cvPage === 1}
                              onClick={() => setCvPage((p) => p - 1)}
                            >
                              ‹
                            </button>
                            {Array.from({ length: cvTotalPages }, (_, i) => i + 1)
                              .filter((p) => p === 1 || p === cvTotalPages || Math.abs(p - cvPage) <= 2)
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
                                    className={`page-btn ${p === cvPage ? 'active' : ''}`}
                                    onClick={() => setCvPage(p)}
                                  >
                                    {p}
                                  </button>
                                )
                              )}
                            <button
                              className="page-btn"
                              disabled={cvPage === cvTotalPages}
                              onClick={() => setCvPage((p) => p + 1)}
                            >
                              ›
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              /* ── Normal search mode ── */
              <>
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
                        <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đến trang:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          placeholder={page}
                          style={{
                            width: 52,
                            padding: '2px 6px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = parseInt(e.target.value)
                              if (v >= 1 && v <= totalPages) {
                                setPage(v)
                                e.target.value = ''
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
