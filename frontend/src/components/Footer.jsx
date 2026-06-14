const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div>
          <div className="brand" style={{ marginBottom: 12 }}>
            <span className="brand-mark">CB</span>CareerBridge
          </div>
          <p style={{ maxWidth: 380, lineHeight: 1.7 }}>
            Nền tảng kết nối ứng viên và nhà tuyển dụng. Giúp bạn tìm công việc phù hợp với kỹ năng, kinh nghiệm và mục tiêu sự nghiệp.
          </p>
        </div>
        <div>
          <h4>Liên kết nhanh</h4>
          <a className="footer-link" href="#">Tìm việc làm</a>
          <a className="footer-link" href="#">Công ty</a>
          <a className="footer-link" href="#">Cẩm nang nghề nghiệp</a>
          <a className="footer-link" href="#">Trung tâm trợ giúp</a>
        </div>
        <div>
          <h4>Liên hệ</h4>
          <a className="footer-link" href="#">support@careerbridge.vn</a>
          <a className="footer-link" href="#">+84 24 7300 0000</a>
          <a className="footer-link" href="#">Số 1 Đại Cồ Việt, Hà Nội</a>
        </div>
      </div>
      <div className="footer-bottom">© 2026 CareerBridge. Đồ án tốt nghiệp DATN.</div>
    </div>
  </footer>
)

export default Footer
