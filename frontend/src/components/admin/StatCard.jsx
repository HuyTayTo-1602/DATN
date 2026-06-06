export default function StatCard({ label, value, icon, color = 'var(--primary)', newCount, periodLabel, changePct }) {
  const positive = changePct > 0
  const negative = changePct < 0

  return (
    <div style={{
      background: 'var(--bg-card, #1a2236)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f0f4ff', lineHeight: 1 }}>
        {value ?? '—'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        {newCount != null && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            +{newCount} {periodLabel || 'mới'}
          </span>
        )}
        {changePct != null && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 700,
            color: positive ? '#4ade80' : negative ? '#f87171' : 'var(--text-muted)',
            background: positive ? '#4ade8015' : negative ? '#f8717115' : 'transparent',
            padding: '2px 6px', borderRadius: 20,
          }}>
            {positive ? '▲' : negative ? '▼' : '—'} {Math.abs(changePct)}%
          </span>
        )}
      </div>
    </div>
  )
}
