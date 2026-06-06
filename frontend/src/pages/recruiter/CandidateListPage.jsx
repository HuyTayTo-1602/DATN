import { useState, useCallback } from 'react'
import { candidateApi } from '../../services/api'
import CandidateSearchBar from '../../components/recruiter/CandidateSearchBar'
import Spinner from '../../components/Spinner'

const PAGE_SIZE = 10

async function openCv(userId, setLoadingCv) {
  setLoadingCv(userId)
  try {
    const blob = await candidateApi.streamCv(userId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (err) {
    alert('Không thể mở CV: ' + err.message)
  } finally {
    setLoadingCv(null)
  }
}

function SkillTags({ skillsText }) {
  if (!skillsText) return null
  const tags = skillsText
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            borderRadius: 99,
            padding: '2px 10px',
            fontSize: '0.78rem',
            fontWeight: 500,
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

function CandidateCard({ candidate, onOpenCv, loadingCv }) {
  const { user_id, full_name, email, skills, experience, bio, score, cv_id, cv_file_name } = candidate

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tên + email */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b' }}>
            {full_name || email.split('@')[0]}
          </span>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{email}</span>
          {score > 0 && (
            <span
              style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                borderRadius: 99,
                padding: '1px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {score.toFixed(2)} điểm
            </span>
          )}
        </div>

        {/* Skills */}
        <SkillTags skillsText={skills} />

        {/* Kinh nghiệm / bio */}
        {(experience || bio) && (
          <p
            style={{
              fontSize: '0.85rem',
              color: '#475569',
              marginTop: 8,
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {experience || bio}
          </p>
        )}
      </div>

      {/* Nút mở CV */}
      <div style={{ flexShrink: 0 }}>
        {cv_id ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenCv(user_id)}
            disabled={loadingCv === user_id}
          >
            {loadingCv === user_id ? 'Đang tải...' : '📄 Xem CV'}
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Chưa có CV</span>
        )}
      </div>
    </div>
  )
}

export default function CandidateListPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [currentQ, setCurrentQ] = useState('')
  const [loadingCv, setLoadingCv] = useState(null)

  const doSearch = useCallback(async (q, p = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await candidateApi.search({ q, page: p, page_size: PAGE_SIZE })
      setResults(data)
      setCurrentQ(q)
      setPage(p)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Tìm kiếm ứng viên
      </h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.92rem' }}>
        Tìm ứng viên theo skill hoặc nội dung CV. Ví dụ: <em>java python</em>, <em>react nodejs</em>.
      </p>

      <CandidateSearchBar onSearch={(q) => doSearch(q, 1)} loading={loading} />

      <div style={{ marginTop: 32 }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spinner text="Đang tìm kiếm..." />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '14px 18px',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state — chưa search */}
        {!loading && !error && results === null && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
            <p>Nhập keyword để bắt đầu tìm kiếm ứng viên.</p>
          </div>
        )}

        {/* Empty state — có search nhưng không có kết quả */}
        {!loading && !error && results !== null && results.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
            <p>Không tìm thấy ứng viên phù hợp với &quot;{currentQ}&quot;.</p>
          </div>
        )}

        {/* Kết quả */}
        {!loading && !error && results !== null && results.items.length > 0 && (
          <>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 16 }}>
              Tìm thấy <strong>{results.total}</strong> ứng viên
              {currentQ && <> cho &quot;<strong>{currentQ}</strong>&quot;</>}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.items.map((c) => (
                <CandidateCard
                  key={c.user_id}
                  candidate={c}
                  onOpenCv={(uid) => openCv(uid, setLoadingCv)}
                  loadingCv={loadingCv}
                />
              ))}
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 28,
                }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => doSearch(currentQ, page - 1)}
                >
                  ← Trước
                </button>
                <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                  Trang {page} / {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => doSearch(currentQ, page + 1)}
                >
                  Sau →
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Đến trang:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={page}
                  style={{
                    width: 52,
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: 'transparent',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = parseInt(e.target.value)
                      if (v >= 1 && v <= totalPages) {
                        doSearch(currentQ, v)
                        e.target.value = ''
                      }
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
