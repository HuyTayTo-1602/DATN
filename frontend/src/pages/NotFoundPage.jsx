import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div className="container" style={{ padding: '96px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>404</div>
      <h2 style={{ marginTop: 8 }}>Không tìm thấy trang</h2>
      <p className="text-secondary" style={{ marginTop: 8, marginBottom: 24 }}>Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        <Icon name="arrow-left" size={14} />Về trang chủ
      </button>
    </div>
  )
}

export default NotFoundPage
