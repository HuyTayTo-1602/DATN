"""
One-time script: add Fresher level templates to job_templates.json
and seed ~60 Fresher jobs into the DB.
Run: cd backend && python scripts/add_fresher_templates.py
"""
import sys, os, json, random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATA_FILE = os.path.join(os.path.dirname(__file__), "seed", "data", "job_templates.json")

FRESHER_TEMPLATES = {
    "backend": [{"title": "Fresher Backend Developer", "salary": "6-10 triệu",
        "description": "Cơ hội tuyệt vời cho sinh viên mới tốt nghiệp hoặc sắp tốt nghiệp ngành CNTT gia nhập team backend. Bạn sẽ được đào tạo bài bản từ senior developer, tham gia phát triển tính năng thực tế và học cách làm việc trong môi trường Agile chuyên nghiệp.",
        "requirements": "- Đang học năm cuối hoặc đã tốt nghiệp Đại học CNTT\n- Hiểu biết cơ bản về lập trình (Python, Java, hoặc Node.js)\n- Ham học hỏi, chủ động và không ngại thử sai\n- Không yêu cầu kinh nghiệm làm việc thực tế\n- Có dự án cá nhân trên GitHub là điểm cộng",
        "benefits": "- Lương học việc + xét tăng sau 2 tháng\n- Mentor 1-1 từ senior developer\n- Môi trường thân thiện, không áp lực\n- Cơ hội convert sang Full-time sau 3 tháng\n- Laptop được cấp khi vào chính thức"}],
    "frontend": [{"title": "Fresher Frontend Developer", "salary": "6-10 triệu",
        "description": "Tìm kiếm fresher đam mê thiết kế giao diện web đẹp và mượt mà. Bạn sẽ được hướng dẫn trực tiếp từ team, làm việc với React và TailwindCSS trên các dự án thực tế từ ngày đầu tiên.",
        "requirements": "- Tốt nghiệp hoặc sắp tốt nghiệp Đại học CNTT, Thiết kế hoặc liên quan\n- Biết HTML, CSS, JavaScript cơ bản\n- Có eye for design, quan tâm đến UX/UI\n- Portfolio cá nhân hoặc dự án nhỏ là lợi thế lớn\n- Chịu khó học hỏi và tiếp thu feedback",
        "benefits": "- Lương fresher cạnh tranh\n- Được làm việc với thiết kế thực tế\n- Học React và công nghệ frontend hiện đại\n- Môi trường trẻ, sáng tạo\n- Full-time sau thử việc thành công"}],
    "data": [{"title": "Fresher Data Analyst", "salary": "7-11 triệu",
        "description": "Cơ hội lý tưởng để bước chân vào lĩnh vực Data Analytics. Bạn sẽ học cách thu thập, làm sạch dữ liệu và xây dựng báo cáo trực quan dưới sự hướng dẫn của team senior data.",
        "requirements": "- Tốt nghiệp Đại học Thống kê, Toán, CNTT hoặc tương đương\n- Thành thạo Excel, biết SQL cơ bản\n- Có tư duy phân tích và thích làm việc với số liệu\n- Biết Python cơ bản (Pandas) là lợi thế\n- GPA 3.0+ là lợi thế",
        "benefits": "- Được đào tạo SQL, Python, Power BI\n- Làm việc với dữ liệu thực tế của doanh nghiệp\n- Môi trường data-driven\n- Lộ trình rõ ràng lên Data Analyst chính thức\n- Bảo hiểm đầy đủ từ ngày 1"}],
    "devops": [{"title": "Fresher DevOps / Cloud Engineer", "salary": "7-12 triệu",
        "description": "Tìm kiếm fresher có đam mê với hệ thống và cloud. Bạn sẽ được học Docker, Linux và CI/CD trong môi trường thực tế, hỗ trợ team trong các tác vụ vận hành hàng ngày.",
        "requirements": "- Tốt nghiệp Đại học CNTT, Mạng máy tính hoặc liên quan\n- Hiểu biết cơ bản về Linux và networking\n- Hứng thú với cloud, automation và infrastructure\n- Biết bash scripting cơ bản\n- Chứng chỉ AWS/GCP cơ bản là điểm cộng",
        "benefits": "- Cloud training budget được tài trợ\n- Làm việc với hệ thống thực tế của công ty\n- On-call allowance khi tham gia rotation\n- Cơ hội lấy chứng chỉ AWS được công ty hỗ trợ\n- Môi trường học tập tốc độ cao"}],
    "qa": [{"title": "Fresher QA / Software Tester", "salary": "6-10 triệu",
        "description": "Cơ hội hoàn hảo để bắt đầu sự nghiệp trong lĩnh vực kiểm thử phần mềm. Bạn sẽ được đào tạo từ manual testing đến automation, làm việc trực tiếp trên các sản phẩm thực tế.",
        "requirements": "- Tốt nghiệp Đại học CNTT hoặc các ngành kỹ thuật liên quan\n- Hiểu biết cơ bản về SDLC và quy trình phát triển phần mềm\n- Tỉ mỉ, cẩn thận và có tư duy phân tích tốt\n- Không cần kinh nghiệm testing thực tế\n- Biết Selenium hoặc Postman cơ bản là điểm cộng",
        "benefits": "- Đào tạo manual và automation testing bài bản\n- ISTQB Foundation được hỗ trợ thi\n- Môi trường test thực tế\n- Career path rõ ràng\n- Team QA năng động, hỗ trợ nhau"}],
    "mobile": [{"title": "Fresher Mobile Developer", "salary": "7-12 triệu",
        "description": "Tìm kiếm fresher đam mê phát triển ứng dụng di động. Bạn sẽ được dẫn dắt để xây dựng tính năng thực tế trên iOS/Android hoặc React Native, học cách publish app và làm việc trong team mobile chuyên nghiệp.",
        "requirements": "- Tốt nghiệp Đại học CNTT hoặc liên quan\n- Biết Swift, Kotlin, hoặc React Native cơ bản\n- Có app cá nhân trên App Store/Google Play là lợi thế lớn\n- Đam mê mobile và trải nghiệm người dùng\n- Chịu khó học hỏi công nghệ mới",
        "benefits": "- iPhone/Android device cấp để test\n- Học từ senior mobile developer có kinh nghiệm\n- Tham gia publish app thực tế\n- Môi trường sáng tạo\n- Lương review sau 3 tháng"}],
    "ba": [{"title": "Fresher Business Analyst", "salary": "8-12 triệu",
        "description": "Cơ hội tốt cho sinh viên mới ra trường muốn bước vào lĩnh vực phân tích nghiệp vụ. Bạn sẽ học cách thu thập yêu cầu, viết tài liệu và làm việc với team phát triển phần mềm theo Agile.",
        "requirements": "- Tốt nghiệp Đại học CNTT, Kinh tế, Quản trị kinh doanh hoặc liên quan\n- Tư duy logic tốt và kỹ năng diễn đạt rõ ràng\n- Ham học hỏi về quy trình phần mềm và nghiệp vụ\n- Biết sử dụng Jira, Confluence cơ bản là điểm cộng\n- Tiếng Anh đọc hiểu tài liệu",
        "benefits": "- Đào tạo Agile và kỹ năng BA từ đầu\n- Làm việc với team product thực tế\n- Mentoring từ senior BA\n- Chứng chỉ ECBA được hỗ trợ\n- Lộ trình phát triển rõ ràng"}],
    "healthcare": [{"title": "Sinh viên Thực tập Y / Điều dưỡng", "salary": "5-8 triệu",
        "description": "Chương trình thực tập có thù lao cho sinh viên ngành Y, Dược, Điều dưỡng. Bạn sẽ làm việc cùng đội ngũ y tế chuyên nghiệp, được hướng dẫn trực tiếp tại các khoa lâm sàng và học cách vận hành môi trường y tế thực tế.",
        "requirements": "- Đang học năm 5-6 Đại học Y/Dược hoặc năm cuối Cao đẳng Điều dưỡng\n- Nghiêm túc, có trách nhiệm và đạo đức nghề nghiệp cao\n- Sức khỏe tốt để làm việc theo ca\n- Thái độ học hỏi và phục vụ bệnh nhân tận tâm",
        "benefits": "- Phụ cấp thực tập + bữa ăn ca\n- Môi trường bệnh viện chuyên nghiệp\n- Học từ bác sĩ và điều dưỡng giàu kinh nghiệm\n- Ưu tiên tuyển dụng chính thức sau tốt nghiệp\n- Chứng chỉ thực tập được cấp"}],
    "finance": [{"title": "Fresher Kế toán / Tài chính", "salary": "7-11 triệu",
        "description": "Cơ hội cho sinh viên mới tốt nghiệp ngành Kế toán, Tài chính muốn bắt đầu sự nghiệp trong môi trường doanh nghiệp chuyên nghiệp. Bạn sẽ được đào tạo nghiệp vụ thực tế và cơ hội học thêm chứng chỉ nghề nghiệp.",
        "requirements": "- Tốt nghiệp Đại học Kế toán, Tài chính, Kiểm toán\n- Thành thạo Excel, hiểu biết cơ bản về kế toán\n- Cẩn thận, trung thực và có tư duy số học tốt\n- GPA 3.0+ là lợi thế\n- Chứng chỉ kế toán hoặc đang học ACCA là điểm cộng",
        "benefits": "- Lương fresher + thưởng cuối năm\n- Môi trường tài chính chuyên nghiệp\n- Hỗ trợ học CPA/ACCA\n- Được tiếp xúc nghiệp vụ tài chính thực tế\n- Ổn định và phát triển bền vững"}],
    "marketing": [{"title": "Fresher Marketing / Content", "salary": "6-10 triệu",
        "description": "Tìm kiếm fresher sáng tạo, yêu thích marketing và mạng xã hội. Bạn sẽ hỗ trợ team lên ý tưởng content, thực hiện chiến dịch digital và học cách phân tích hiệu quả quảng cáo.",
        "requirements": "- Tốt nghiệp Đại học Marketing, Truyền thông, Báo chí hoặc liên quan\n- Kỹ năng viết lách sáng tạo, am hiểu mạng xã hội\n- Biết Canva, CapCut hoặc công cụ thiết kế cơ bản\n- Năng động, có nhiều ý tưởng mới\n- Portfolio bài viết hoặc dự án cá nhân là điểm cộng",
        "benefits": "- Môi trường sáng tạo, trẻ trung\n- Thực hành chạy campaign thực tế\n- Google/Meta certificate được tài trợ\n- Team nhỏ, học được nhiều thứ\n- Convert full-time sau 3 tháng thử việc"}],
    "hr": [{"title": "Fresher HR / Tuyển dụng", "salary": "7-10 triệu",
        "description": "Cơ hội bắt đầu sự nghiệp HR trong môi trường doanh nghiệp chuyên nghiệp. Bạn sẽ học cách đăng tuyển, lọc hồ sơ, phối hợp phỏng vấn và các nghiệp vụ hành chính nhân sự cơ bản.",
        "requirements": "- Tốt nghiệp Đại học Quản trị Nhân lực, Kinh tế hoặc liên quan\n- Kỹ năng giao tiếp tốt, thân thiện và chuyên nghiệp\n- Cẩn thận, bảo mật thông tin tốt\n- Biết sử dụng LinkedIn, VietnamWorks là điểm cộng\n- Tiếng Anh giao tiếp được",
        "benefits": "- Học nghề tuyển dụng từ HR senior\n- Môi trường làm việc thân thiện\n- Lộ trình phát triển lên HRBP\n- Giờ làm hành chính, ổn định\n- Bảo hiểm đầy đủ từ ngày 1"}],
    "education": [{"title": "Trợ giảng / Gia sư Tại trung tâm", "salary": "6-10 triệu",
        "description": "Cơ hội cho sinh viên năng động yêu thích việc dạy học và truyền đạt kiến thức. Bạn sẽ hỗ trợ giáo viên chính trong các buổi học, chấm bài và theo dõi tiến bộ của học viên.",
        "requirements": "- Đang học đại học hoặc mới tốt nghiệp bất kỳ ngành nào\n- IELTS 6.5+ hoặc tiếng Anh giao tiếp tốt (đối với trung tâm tiếng Anh)\n- Nhiệt tình, kiên nhẫn và thích giao tiếp với học sinh\n- Có kinh nghiệm dạy kèm/gia sư là lợi thế\n- Có thể làm buổi tối và cuối tuần",
        "benefits": "- Lương dạy theo giờ hấp dẫn\n- Được học các khóa nâng cao miễn phí\n- Môi trường năng động, trẻ trung\n- Cơ hội trở thành giáo viên chính thức\n- Linh hoạt giờ làm phù hợp sinh viên"}],
    "fnb": [{"title": "Nhân viên Part-time F&B / Phục vụ", "salary": "5-9 triệu",
        "description": "Tuyển nhân viên phục vụ bán thời gian cho nhà hàng/quán cafe. Không cần kinh nghiệm, được đào tạo bài bản ngay từ đầu. Phù hợp cho sinh viên muốn có thêm thu nhập và kinh nghiệm thực tế trong ngành F&B.",
        "requirements": "- Từ 18 tuổi trở lên\n- Ngoại hình ưa nhìn, nụ cười thân thiện\n- Chịu khó, có trách nhiệm và đúng giờ\n- Có thể làm ca tối (từ 17h-22h) và cuối tuần\n- Không yêu cầu kinh nghiệm, được đào tạo ngay",
        "benefits": "- Lương theo giờ + tips\n- Bữa ăn ca miễn phí\n- Đồng phục được cấp\n- Giờ linh hoạt phù hợp sinh viên\n- Cơ hội trở thành nhân viên toàn thời gian"}],
    "retail": [{"title": "Nhân viên Bán hàng Part-time", "salary": "5-9 triệu",
        "description": "Tuyển nhân viên bán hàng bán thời gian tại chuỗi cửa hàng bán lẻ. Phù hợp cho sinh viên muốn tích lũy kinh nghiệm trong ngành bán lẻ và có thêm thu nhập trong khi học.",
        "requirements": "- Từ 18 tuổi trở lên, ngoại hình dễ nhìn\n- Giao tiếp tốt và thân thiện với khách hàng\n- Trung thực và cẩn thận khi xử lý tiền\n- Có thể làm ca xoay và làm cuối tuần\n- Không yêu cầu kinh nghiệm bán lẻ",
        "benefits": "- Lương cơ bản + hoa hồng\n- Đào tạo kỹ năng bán hàng\n- Giảm giá nhân viên 20%\n- Ca linh hoạt\n- Cơ hội full-time sau thử việc"}],
    "construction": [{"title": "Kỹ sư Thực tập Xây dựng", "salary": "6-10 triệu",
        "description": "Chương trình thực tập có thù lao cho sinh viên ngành Xây dựng, Kiến trúc. Bạn sẽ tham gia công trường thực tế, học đọc bản vẽ, giám sát thi công và hỗ trợ kỹ sư senior trong các tác vụ hàng ngày.",
        "requirements": "- Đang học năm 3-4 hoặc mới tốt nghiệp Đại học Xây dựng/Kiến trúc\n- Biết AutoCAD cơ bản\n- Không ngại làm việc ngoài trời\n- Chịu khó, kỷ luật và ham học hỏi\n- Có thể đi thực địa tại công trường",
        "benefits": "- Phụ cấp thực tập + phụ cấp công trường\n- Kinh nghiệm công trường thực tế\n- Học từ kỹ sư senior\n- Ưu tiên tuyển dụng sau tốt nghiệp\n- Chứng chỉ thực tập được cấp"}],
    "logistics": [{"title": "Fresher Logistics / Xuất nhập khẩu", "salary": "7-11 triệu",
        "description": "Cơ hội bắt đầu sự nghiệp trong lĩnh vực logistics và xuất nhập khẩu. Bạn sẽ được hướng dẫn về chứng từ thương mại, quy trình thông quan và nghiệp vụ vận tải quốc tế.",
        "requirements": "- Tốt nghiệp Đại học Ngoại thương, Logistics hoặc liên quan\n- Tiếng Anh đọc viết tốt (đọc chứng từ tiếng Anh)\n- Cẩn thận và tỉ mỉ với chứng từ\n- Chịu áp lực deadline shipment\n- Biết Excel cơ bản",
        "benefits": "- Đào tạo chứng từ xuất nhập khẩu từ A-Z\n- Học Incoterms, L/C, B/L thực tế\n- Môi trường logistics quốc tế\n- Lộ trình phát triển rõ ràng\n- FIATA certificate được hỗ trợ"}],
    "manufacturing": [{"title": "Kỹ thuật viên Thực tập Sản xuất", "salary": "6-10 triệu",
        "description": "Chương trình thực tập sản xuất dành cho sinh viên kỹ thuật. Bạn sẽ làm việc trực tiếp tại dây chuyền sản xuất, học cách vận hành thiết bị và áp dụng các công cụ cải tiến như 5S, Kaizen vào thực tế.",
        "requirements": "- Đang học năm 3-4 hoặc mới tốt nghiệp Đại học Kỹ thuật Công nghiệp\n- Ham học hỏi và chịu khó làm việc trong môi trường nhà máy\n- Sẵn sàng làm ca theo yêu cầu\n- Không yêu cầu kinh nghiệm sản xuất\n- Có thể làm thực tập toàn thời gian",
        "benefits": "- Phụ cấp thực tập + phụ cấp ca\n- Ăn ca miễn phí\n- Học kỹ thuật sản xuất từ chuyên gia\n- Ưu tiên tuyển chính thức sau tốt nghiệp\n- Môi trường nhà máy quốc tế tiên tiến"}],
}

def add_fresher_to_templates():
    with open(DATA_FILE, encoding="utf-8") as f:
        templates = json.load(f)

    changed = False
    for domain, fresher_list in FRESHER_TEMPLATES.items():
        if domain in templates and "Fresher" not in templates[domain]:
            templates[domain]["Fresher"] = fresher_list
            changed = True
            print(f"  Added Fresher to domain: {domain}")

    if changed:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(templates, f, ensure_ascii=False, indent=2)
        print("job_templates.json updated.")
    else:
        print("No changes needed.")
    return changed


def seed_fresher_jobs():
    """Add ~60 Fresher jobs to existing companies in the DB."""
    # backend/ must be on path for app.* imports
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.db.database import SessionLocal
    from app.models.company import Company
    from app.models.job import Job

    with open(DATA_FILE, encoding="utf-8") as f:
        templates = json.load(f)

    # Load company templates to know each company's domain
    company_data_file = os.path.join(os.path.dirname(__file__), "seed", "data", "company_templates.json")
    with open(company_data_file, encoding="utf-8") as f:
        company_tmpl_list = json.load(f)
    domain_by_name = {t["name"].lower(): t["domain"] for t in company_tmpl_list}

    deadline_min = date(2026, 10, 1)
    deadline_max = date(2027, 6, 30)

    def random_deadline():
        delta = (deadline_max - deadline_min).days
        return deadline_min + timedelta(days=random.randint(0, delta))

    def get_domain(company_name: str) -> str:
        name_lower = company_name.lower()
        for key, domain in domain_by_name.items():
            if key in name_lower or name_lower in key:
                return domain
        return "backend"

    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        created = 0

        for company in companies:
            domain = get_domain(company.name)
            fresher_tmpls = templates.get(domain, {}).get("Fresher", [])
            if not fresher_tmpls:
                fresher_tmpls = templates.get("backend", {}).get("Fresher", [])

            tmpl = random.choice(fresher_tmpls)
            loc_raw = company.address or ""
            if "Hồ Chí Minh" in loc_raw or "HCM" in loc_raw:
                location = "TP. Hồ Chí Minh"
            elif "Đà Nẵng" in loc_raw:
                location = "Đà Nẵng"
            else:
                location = "Hà Nội"

            # Each company gets 0-1 Fresher job
            if random.random() < 0.9:  # 90% of companies get a Fresher job
                job = Job(
                    company_id=company.id,
                    title=tmpl["title"],
                    level="Fresher",
                    salary=tmpl["salary"],
                    location=random.choice([location, f"{location} (Hybrid)", "Remote"]),
                    deadline=random_deadline(),
                    status="active",
                    description=tmpl["description"],
                    requirements=tmpl["requirements"],
                    benefits=tmpl["benefits"],
                )
                db.add(job)
                created += 1

        db.commit()
        fresher_count = db.query(Job).filter(Job.level == "Fresher").count()
        print(f"  Fresher jobs created: {created} | Total Fresher in DB: {fresher_count}")
    finally:
        db.close()


if __name__ == "__main__":
    print("=== Adding Fresher templates ===")
    add_fresher_to_templates()
    print("\n=== Seeding Fresher jobs ===")
    seed_fresher_jobs()
    print("\nDone.")
