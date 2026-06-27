import { useEffect, useRef, useState } from 'react'

// ============================================================
// SelectDown – dropdown tuỳ biến LUÔN mở xuống dưới.
// (Thẻ <select> gốc của trình duyệt tự mở lên trên khi ô nằm
//  gần đáy màn hình; component này khắc phục điều đó.)
// Hỗ trợ ô tìm kiếm cho danh sách dài (vd. 63 tỉnh/thành).
// ============================================================
const SelectDown = ({
  value = '',
  onChange,
  options = [],
  placeholder = '-- Chọn --',
  disabled = false,
  searchable = false,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const norm = (s) => s.toLowerCase()
  const filtered =
    searchable && query.trim()
      ? options.filter((o) => norm(o).includes(norm(query.trim())))
      : options

  const choose = (opt) => {
    onChange(opt)
    setOpen(false)
  }

  return (
    <div className={`select-down${disabled ? ' is-disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className="select-down-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={value ? '' : 'select-down-placeholder'}>
          {value || placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="select-down-menu" role="listbox">
          {searchable && (
            <input
              className="select-down-search"
              autoFocus
              placeholder="Tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <ul className="select-down-list">
            {filtered.length === 0 && (
              <li className="select-down-empty">Không có kết quả</li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={`select-down-option${opt === value ? ' is-selected' : ''}`}
                onClick={() => choose(opt)}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SelectDown
