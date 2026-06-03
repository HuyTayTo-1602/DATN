// Left panel of the chat layout.
// Recruiter: radio list of owned jobs + "Phân tích ứng viên" label.
// Job Seeker: clickable topic hint chips.
// Both: "Cuộc trò chuyện mới" button to clear the thread.

const TOPIC_HINTS = [
  'Thị trường lao động hiện tại',
  'Kỹ năng cần thiết cho lập trình viên Backend',
  'Cách viết CV xin việc hiệu quả',
  'Mức lương trung bình ngành IT',
  'Chuẩn bị phỏng vấn kỹ thuật',
  'Xu hướng tuyển dụng 2025',
]

export default function ChatSidebar({
  role,
  jobs,
  selectedJobId,
  onSelectJob,
  onHintClick,
  onNewThread,
  loadingJobs,
}) {
  return (
    <aside className="chat-sidebar">
      {role === 'recruiter' ? (
        <>
          <div className="chat-sidebar-section">
            <div className="chat-sidebar-label">Phân tích ứng viên</div>
            <p className="chat-sidebar-hint">Chọn tin tuyển dụng để hỏi về ứng viên</p>

            {loadingJobs ? (
              <div className="chat-sidebar-loading">Đang tải...</div>
            ) : jobs.length === 0 ? (
              <div className="chat-sidebar-empty">Bạn chưa có tin tuyển dụng nào.</div>
            ) : (
              <ul className="chat-job-list">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <label className={`chat-job-item ${selectedJobId === job.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="job"
                        value={job.id}
                        checked={selectedJobId === job.id}
                        onChange={() => onSelectJob(job.id)}
                      />
                      <span className="chat-job-title">{job.title}</span>
                      <span className={`badge ${job.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {job.status === 'active' ? 'Đang mở' : job.status}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {selectedJobId && (
              <div className="chat-selected-badge">
                Đang hỏi về:{' '}
                <strong>{jobs.find((j) => j.id === selectedJobId)?.title}</strong>
              </div>
            )}
          </div>

          <div className="chat-sidebar-section" style={{ marginTop: 8 }}>
            <div className="chat-sidebar-label">Hỏi chung</div>
            <p className="chat-sidebar-hint">
              Hoặc đặt câu hỏi về tuyển dụng, thị trường lao động…
            </p>
          </div>
        </>
      ) : (
        <div className="chat-sidebar-section">
          <div className="chat-sidebar-label">Gợi ý chủ đề</div>
          <div className="chat-topic-list">
            {TOPIC_HINTS.map((hint) => (
              <button
                key={hint}
                className="chat-topic-chip"
                onClick={() => onHintClick(hint)}
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-sidebar-footer">
        <button className="btn btn-ghost btn-sm btn-full" onClick={onNewThread}>
          + Cuộc trò chuyện mới
        </button>
      </div>
    </aside>
  )
}
