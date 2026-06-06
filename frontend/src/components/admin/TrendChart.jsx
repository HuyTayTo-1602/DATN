const W = 600, H = 170
const PAD = { top: 16, right: 20, bottom: 36, left: 42 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function buildPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
}

export default function TrendChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        📈 Chưa đủ dữ liệu để hiển thị xu hướng
      </div>
    )
  }

  const maxVal = Math.max(...data.flatMap(d => [d.new_jobs, d.new_applications]), 1)
  const n = data.length

  const xOf = (i) => PAD.left + (i / (n - 1)) * CW
  const yOf = (v) => PAD.top + CH - (v / maxVal) * CH

  const jobPts  = data.map((d, i) => [xOf(i), yOf(d.new_jobs)])
  const appPts  = data.map((d, i) => [xOf(i), yOf(d.new_applications)])
  const gridY   = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
        {/* Grid lines */}
        {gridY.map(r => {
          const y = PAD.top + CH * (1 - r)
          const label = Math.round(maxVal * r)
          return (
            <g key={r}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
                stroke="rgba(255,255,255,0.07)" strokeDasharray="3 4" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">
                {label}
              </text>
            </g>
          )
        })}

        {/* Area fills */}
        <path
          d={`${buildPath(jobPts)} L${xOf(n-1)},${PAD.top+CH} L${xOf(0)},${PAD.top+CH} Z`}
          fill="#6366f1" fillOpacity={0.08}
        />
        <path
          d={`${buildPath(appPts)} L${xOf(n-1)},${PAD.top+CH} L${xOf(0)},${PAD.top+CH} Z`}
          fill="#22c55e" fillOpacity={0.08}
        />

        {/* Lines */}
        <path d={buildPath(jobPts)} fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={buildPath(appPts)} fill="none" stroke="#4ade80" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Dots */}
        {jobPts.map(([x, y], i) => (
          <circle key={`j${i}`} cx={x} cy={y} r={3.5} fill="#818cf8" />
        ))}
        {appPts.map(([x, y], i) => (
          <circle key={`a${i}`} cx={x} cy={y} r={3.5} fill="#4ade80" />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">
            {d.week_start}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 4 }}>
        {[
          { color: '#818cf8', label: 'Tin đăng mới' },
          { color: '#4ade80', label: 'Đơn ứng tuyển mới' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.77rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 22, height: 3, background: color, borderRadius: 2, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
