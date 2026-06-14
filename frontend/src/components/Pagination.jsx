import { useMemo, useState } from 'react'
import Icon from './Icon'

const Pagination = ({ page = 1, total = 1, onChange, withGoto }) => {
  const [goto, setGotoVal] = useState('')
  const pages = useMemo(() => {
    const out = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) out.push(i)
    } else {
      out.push(1)
      if (page > 3) out.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) out.push(i)
      if (page < total - 2) out.push('...')
      out.push(total)
    }
    return out
  }, [page, total])

  const submitGoto = (e) => {
    e?.preventDefault()
    const n = parseInt(goto, 10)
    if (!isNaN(n) && n >= 1 && n <= total) onChange(n)
    setGotoVal('')
  }

  if (total <= 1) return null

  return (
    <div className="pagination">
      <button className={`page-btn ${page <= 1 ? 'disabled' : ''}`} onClick={() => page > 1 && onChange(page - 1)}>
        <Icon name="chevron-left" size={14} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={i} className="page-btn disabled">…</span>
        ) : (
          <button key={i} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>
            {p}
          </button>
        )
      )}
      <button className={`page-btn ${page >= total ? 'disabled' : ''}`} onClick={() => page < total && onChange(page + 1)}>
        <Icon name="chevron-right" size={14} />
      </button>
      {withGoto && (
        <form className="page-goto" onSubmit={submitGoto}>
          <span>Đến trang:</span>
          <input className="input" value={goto} onChange={(e) => setGotoVal(e.target.value)} placeholder={String(page)} />
        </form>
      )}
    </div>
  )
}

export default Pagination
