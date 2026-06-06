import { Link } from 'react-router-dom'

const features = [
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke="#38bdf8" strokeWidth="1.8" />
        <path d="M9 14l3.5 3.5L19 10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Thông tin minh bạch',
    desc: 'Mô tả công việc rõ ràng, mức lương thực tế, không quảng cáo gây hiểu nhầm.',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
        <path d="M5 22L11 10l5 8 4-5 4 9" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="6" r="2.5" fill="#818cf8" />
      </svg>
    ),
    title: 'Gợi ý việc làm thông minh',
    desc: 'Hệ thống phân tích CV, tự động gợi ý job phù hợp với kỹ năng của bạn.',
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="7" width="22" height="16" rx="3" stroke="#34d399" strokeWidth="1.8" />
        <path d="M3 12h22" stroke="#34d399" strokeWidth="1.8" />
        <path d="M9 5v4M19 5v4" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    title: 'Mạng lưới doanh nghiệp uy tín',
    desc: 'Hơn 500 doanh nghiệp đã xác minh, trải dài nhiều ngành và địa phương.',
  },
]

const stats = [
  { num: '1,200+', label: 'Tin tuyển dụng' },
  { num: '500+',   label: 'Doanh nghiệp uy tín' },
  { num: '50K+',   label: 'Ứng viên tin tưởng' },
]

export default function PromoBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#bfdbfe] to-[#e0f2fe] pt-16 pb-0">
      <div className="container mx-auto px-6 text-center">
        <div className="flex justify-center gap-3 mb-8">
          {[['#38bdf8','#0ea5e9'], ['#818cf8','#6366f1'], ['#a3e635','#65a30d']].map(([c1, c2], i) => (
            <svg key={i} width="36" height="28" viewBox="0 0 54 40" fill="none">
              <path d="M6 4L22 20L6 36"  stroke={c1} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 4L36 20L20 36" stroke={c2} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".55"/>
            </svg>
          ))}
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] leading-tight tracking-tight mb-4">
          Hành Trình Tìm Kiếm<br />
          <span className="text-[#1d4ed8]">Cơ Hội Nghề Nghiệp</span>
        </h2>
        <p className="text-[#334155] text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Kết nối đúng người – đúng việc – đúng thời điểm.
          Nền tảng tuyển dụng minh bạch, thông minh dành cho thế hệ tr\u1� Việt Nam.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link to="/jobs" className="inline-flex items-center gap-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow-lg shadow-blue-300/40">
            Tìm việc ngay →
          </Link>
          <Link to="/register" className="inline-flex items-center gap-2 border-2 border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#1d4ed8] hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
            Đăng ký miễn phí
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-6 mt-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-[#0f172a] rounded-2xl px-7 py-6 flex flex-col gap-4 shadow-xl shadow-slate-900/20">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">{f.icon}</div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 bg-[#0f172a]/90 backdrop-blur">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 divide-x divide-white/10 py-5">
            {stats.map((s) => (
              <div key={s.label} className="text-center py-1">
                <div className="text-2xl md:text-3xl font-black text-white">{s.num}</div>
                <div className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="block w-full" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 48V24C240 0 480 48 720 24C960 0 1200 48 1440 24V48H0Z" fill="#0c1529" />
      </svg>
    </section>
  )
}