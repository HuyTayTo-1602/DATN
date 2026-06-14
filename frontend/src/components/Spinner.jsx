export const Spinner = ({ size = 28 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
    <div
      style={{
        width: size,
        height: size,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 800ms linear infinite',
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export const SkeletonJobCard = () => (
  <div className="job-card" style={{ cursor: 'default' }}>
    <div className="job-card-head">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 10, width: '40%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '80%' }} />
      </div>
    </div>
    <div className="skeleton" style={{ height: 10, width: '70%', marginTop: 12 }} />
    <div className="skeleton" style={{ height: 10, width: '50%', marginTop: 8 }} />
  </div>
)

export const SkeletonRow = ({ width = '100%', height = 14 }) => (
  <div className="skeleton" style={{ width, height }} />
)
