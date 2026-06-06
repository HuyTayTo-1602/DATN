function EmptyBar() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
      📭 Chưa có dữ liệu để hiển thị
    </div>
  )
}

function HorizontalBarChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <EmptyBar />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map(({ label, value, color }) => {
        const pct = Math.round((value / total) * 100)
        return (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: color, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0f4ff' }}>
                {value.toLocaleString()}&nbsp;
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.76rem' }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 4,
                transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                minWidth: pct > 0 ? 4 : 0,
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const JOB_DATA = (s) => [
  { label: 'Active', value: s?.active ?? 0, color: '#4ade80' },
  { label: 'Closed', value: s?.closed ?? 0, color: '#f87171' },
  { label: 'Draft',  value: s?.draft  ?? 0, color: '#fbbf24' },
]

const APP_DATA = (s) => [
  { label: 'Chờ duyệt',  value: s?.pending  ?? 0, color: '#fbbf24' },
  { label: 'Đã xem',     value: s?.reviewed ?? 0, color: '#60a5fa' },
  { label: 'Chấp nhận',  value: s?.accepted ?? 0, color: '#4ade80' },
  { label: 'Từ chối',    value: s?.rejected ?? 0, color: '#f87171' },
]

const CARD_STYLE = {
  background: 'var(--bg-card, #1a2236)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
}

export default function AdminChartPanel({ jobsByStatus, applicationsByStatus }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={CARD_STYLE}>
        <div style={{ fontWeight: 700, marginBottom: 18, fontSize: '0.88rem', color: '#f0f4ff' }}>
          Tin tuyển dụng theo trạng thái
        </div>
        <HorizontalBarChart data={JOB_DATA(jobsByStatus)} />
      </div>

      <div style={CARD_STYLE}>
        <div style={{ fontWeight: 700, marginBottom: 18, fontSize: '0.88rem', color: '#f0f4ff' }}>
          Đơn ứng tuyển theo trạng thái
        </div>
        <HorizontalBarChart data={APP_DATA(applicationsByStatus)} />
      </div>
    </div>
  )
}
