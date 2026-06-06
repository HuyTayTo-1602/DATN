import { useState, useEffect, useRef } from 'react'

/**
 * Thanh tìm kiếm ứng viên với debounce 400ms.
 * Props:
 *   onSearch(q: string) — gọi khi người dùng dừng gõ hoặc nhấn Enter/Search
 *   loading: bool — hiển thị spinner khi đang tải
 *   initialValue: string — giá trị ban đầu
 */
export default function CandidateSearchBar({ onSearch, loading = false, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const debounceRef = useRef(null)

  // Debounce: chờ 400ms sau khi dừng gõ mới gọi onSearch
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(value.trim())
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  const handleSubmit = (e) => {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm theo skill, ví dụ: java python react..."
        style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
        aria-label="Tìm kiếm ứng viên"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ whiteSpace: 'nowrap' }}
      >
        {loading ? 'Đang tìm...' : 'Tìm kiếm'}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => { setValue(''); onSearch('') }}
          className="btn btn-ghost btn-sm"
          title="Xóa tìm kiếm"
        >
          ✕
        </button>
      )}
    </form>
  )
}
