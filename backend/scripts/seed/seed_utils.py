"""Shared utilities for seed scripts."""
import os
import random
import json
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------
SEED_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SEED_DIR, "data")


def load_json(filename: str) -> dict | list:
    with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Vietnamese name data
# ---------------------------------------------------------------------------
FIRST_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
    "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Mai", "Tô",
]

MIDDLE_NAMES_MALE = [
    "Văn", "Đức", "Minh", "Quang", "Hữu", "Thành", "Bá", "Trọng",
    "Thanh", "Xuân", "Công", "Tuấn", "Đình", "Hùng", "Quốc", "Trung",
]

MIDDLE_NAMES_FEMALE = [
    "Thị", "Minh", "Thanh", "Hồng", "Mai", "Lan", "Thu", "Thúy",
    "Phương", "Ngọc", "Bích", "Kim", "Hà", "Linh", "Yến", "Tuyết",
]

LAST_NAMES_MALE = [
    "An", "Bình", "Cường", "Dũng", "Giang", "Hùng", "Huy", "Khoa",
    "Long", "Minh", "Nam", "Phi", "Quân", "Sơn", "Tâm", "Thắng",
    "Tuấn", "Uy", "Việt", "Hiếu", "Nghĩa", "Trung", "Phúc", "Khánh",
    "Đạt", "Tùng", "Lâm", "Thái", "Duy", "Hải", "Quang", "Bảo",
]

LAST_NAMES_FEMALE = [
    "Anh", "Châu", "Dung", "Hà", "Hiền", "Hương", "Khánh", "Lan",
    "Linh", "Mai", "My", "Ngân", "Nga", "Nhung", "Phương", "Trang",
    "Thảo", "Thư", "Uyên", "Vân", "Yến", "Trúc", "Hạnh", "Xuân",
]

LOCATIONS = [
    "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng",
    "Bình Dương", "Đồng Nai", "Hà Nội (Remote)", "TP. HCM (Remote)",
]

STREET_PREFIXES = [
    "Đường", "Phố", "Ngõ", "Hẻm",
]

STREETS = [
    "Nguyễn Trãi", "Trần Hưng Đạo", "Lê Lợi", "Hai Bà Trưng", "Đinh Tiên Hoàng",
    "Hoàng Diệu", "Lý Thường Kiệt", "Phan Đình Phùng", "Bà Triệu", "Phạm Ngũ Lão",
    "Nguyễn Huệ", "Đồng Khởi", "Cách Mạng Tháng 8", "Nguyễn Công Trứ", "Điện Biên Phủ",
    "Nam Kỳ Khởi Nghĩa", "Pasteur", "Võ Văn Tần", "Hoàng Văn Thụ", "Tôn Đức Thắng",
]

EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "mail.com",
]

UNIVERSITIES = [
    "Đại học Bách Khoa Hà Nội",
    "Đại học Công nghệ - ĐHQGHN",
    "Học viện Kỹ thuật Mật mã",
    "Đại học FPT",
    "Đại học Bách Khoa TP.HCM",
    "Đại học Khoa học Tự nhiên TP.HCM",
    "Đại học Công nghệ Thông tin TP.HCM",
    "Đại học Duy Tân Đà Nẵng",
    "Đại học Bách Khoa Đà Nẵng",
    "Đại học RMIT Việt Nam",
    "Đại học Sư phạm Kỹ thuật TP.HCM",
    "Đại học Tôn Đức Thắng",
]

MAJORS = [
    "Kỹ thuật Phần mềm",
    "Công nghệ Thông tin",
    "Khoa học Máy tính",
    "Hệ thống Thông tin",
    "An toàn Thông tin",
    "Trí tuệ Nhân tạo",
    "Kỹ thuật Máy tính",
    "Toán - Tin học",
]

COMPANIES_WORKED = [
    "Công ty TNHH FPT Software", "Viettel Solutions", "Công ty Cổ phần VNG",
    "Startup TechLab", "Công ty TNHH KMS Technology", "Rikkeisoft",
    "Axon Active", "Bosch Vietnam", "Sciente International", "Tiki Corporation",
    "Global CyberSoft", "NashTech Vietnam", "Cốc Cốc", "Grab Vietnam",
    "Freelancer / Dự án cá nhân",
]

CERTIFICATIONS_BY_DOMAIN = {
    "backend": [
        "AWS Certified Developer – Associate",
        "Oracle Certified Professional Java SE",
        "MongoDB Certified Developer",
        "Google Associate Cloud Engineer",
        "Python Institute PCEP",
    ],
    "frontend": [
        "Meta Frontend Developer Professional Certificate",
        "Google UX Design Certificate",
        "AWS Certified Cloud Practitioner",
        "Microsoft Certified: Azure Developer",
        "Scrum Foundation Professional Certificate",
    ],
    "data": [
        "Google Data Analytics Professional Certificate",
        "AWS Certified Machine Learning – Specialty",
        "Databricks Certified Associate Developer for Apache Spark",
        "Tableau Desktop Specialist",
        "Microsoft Certified: Azure Data Scientist Associate",
    ],
    "devops": [
        "AWS Certified DevOps Engineer – Professional",
        "Certified Kubernetes Administrator (CKA)",
        "HashiCorp Terraform Associate",
        "Google Professional Cloud DevOps Engineer",
        "Linux Foundation Certified System Administrator",
    ],
    "qa": [
        "ISTQB Certified Tester Foundation Level",
        "ISTQB Advanced Level Test Automation Engineer",
        "Certified Agile Tester",
        "AWS Certified Cloud Practitioner",
        "Selenium WebDriver with Java – Udemy",
    ],
    "mobile": [
        "Google Associate Android Developer",
        "Apple Swift Certification",
        "Meta React Native Certificate",
        "Google UX Design Certificate",
        "Firebase Developer Certificate",
    ],
    "ba": [
        "CBAP – Certified Business Analysis Professional",
        "PMI-PBA – Professional in Business Analysis",
        "Certified Scrum Product Owner (CSPO)",
        "IIBA Entry Certificate in Business Analysis (ECBA)",
        "Agile Analysis Certification (PMI-AAC)",
    ],
    "healthcare": [
        "Chứng chỉ Hành nghề Khám bệnh, Chữa bệnh",
        "Chứng chỉ Điều dưỡng Chuyên khoa",
        "Chứng chỉ CPR & ACLS (Cấp cứu Ngừng tim)",
        "Chứng chỉ GMP Dược phẩm",
        "ISO 15189 Medical Laboratory Standard",
    ],
    "finance": [
        "CPA – Chứng chỉ Kế toán Công chứng Việt Nam",
        "CFA Level 1 – Chartered Financial Analyst",
        "ACCA – Association of Chartered Certified Accountants",
        "FRM – Financial Risk Manager",
        "Chứng chỉ Hành nghề Kiểm toán Độc lập",
    ],
    "marketing": [
        "Google Digital Marketing & E-commerce Certificate",
        "Meta Blueprint – Facebook Marketing Professional",
        "HubSpot Content Marketing Certificate",
        "Google Analytics Individual Qualification (GAIQ)",
        "CIM Professional Marketing Certificate",
    ],
    "hr": [
        "SHRM-CP – Society for Human Resource Management",
        "PHR – Professional in Human Resources",
        "Chứng chỉ Quản trị Nhân sự – VNHR",
        "Certified Compensation & Benefits Professional",
        "Lean HR Certificate",
    ],
    "education": [
        "Chứng chỉ Nghiệp vụ Sư phạm",
        "CELTA – Certificate in Teaching English (Cambridge)",
        "IELTS Trainer Certificate",
        "Instructional Design Certificate",
        "Google for Education Certified Trainer",
    ],
    "fnb": [
        "ServSafe Food Manager Certification",
        "Chứng chỉ Vệ sinh An toàn Thực phẩm",
        "WSET Level 2 – Wine & Spirit Education Trust",
        "Certified Sommelier – Court of Master Sommeliers",
        "SCA Barista Level 2",
    ],
    "retail": [
        "Chứng chỉ Quản lý Bán lẻ – NRF",
        "Visual Merchandising International (VMI)",
        "Retail Management Certificate",
        "Customer Experience Professional (CCXP)",
        "Certified Retail Analyst",
    ],
    "construction": [
        "Chứng chỉ Hành nghề Kỹ sư Xây dựng",
        "PMP – Project Management Professional",
        "Chứng chỉ An toàn Lao động Xây dựng",
        "BIM Manager Certificate (Autodesk)",
        "Certified Construction Manager (CCM)",
    ],
    "logistics": [
        "APICS CSCP – Certified Supply Chain Professional",
        "CLTD – Certified in Logistics, Transportation and Distribution",
        "FIATA Diploma in Freight Forwarding",
        "Lean Six Sigma Green Belt",
        "Customs Broker License",
    ],
    "manufacturing": [
        "Lean Manufacturing Practitioner Certificate",
        "Six Sigma Black Belt (ASQ)",
        "ISO 9001:2015 Lead Auditor",
        "IATF 16949 Internal Auditor",
        "TPM Coordinator Certificate – JIPM",
    ],
}


def random_gender() -> str:
    return random.choice(["male", "female"])


def random_full_name(gender: str = None) -> str:
    if gender is None:
        gender = random_gender()
    first = random.choice(FIRST_NAMES)
    if gender == "female":
        middle = random.choice(MIDDLE_NAMES_FEMALE)
        last = random.choice(LAST_NAMES_FEMALE)
    else:
        middle = random.choice(MIDDLE_NAMES_MALE)
        last = random.choice(LAST_NAMES_MALE)
    return f"{first} {middle} {last}"


def random_phone() -> str:
    prefixes = ["090", "091", "093", "094", "096", "097", "098",
                "032", "033", "034", "035", "036", "037", "038", "039",
                "070", "076", "077", "078", "079"]
    return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(7)])


def random_address() -> str:
    num = random.randint(1, 150)
    street = random.choice(STREETS)
    city = random.choice(["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"])
    return f"Số {num} {street}, {city}"


def random_dob(min_age: int = 22, max_age: int = 38) -> date:
    today = date.today()
    years_back = random.randint(min_age, max_age)
    days_offset = random.randint(0, 364)
    return today - timedelta(days=years_back * 365 + days_offset)


def random_future_date(min_days: int = 14, max_days: int = 120) -> date:
    return date.today() + timedelta(days=random.randint(min_days, max_days))


def random_past_date(min_days: int = 1, max_days: int = 365) -> date:
    return date.today() - timedelta(days=random.randint(min_days, max_days))


def pick_skills(domain: str, catalog: dict, count: int = None) -> list[str]:
    """Pick a realistic set of skills for a domain."""
    domain_skills = catalog.get(domain, {})
    all_skills = []
    for group in domain_skills.values():
        all_skills.extend(group)
    if not all_skills:
        return []
    if count is None:
        count = random.randint(4, 8)
    return random.sample(all_skills, min(count, len(all_skills)))


def generate_cv_text(
    full_name: str,
    email: str,
    phone: str,
    domain: str,
    skills: list[str],
    level: str = "Middle",
) -> str:
    """Generate realistic CV text for a candidate."""
    university = random.choice(UNIVERSITIES)
    major = random.choice(MAJORS)
    gpa = round(random.uniform(3.0, 3.9), 1)
    grad_year = random.randint(2016, 2023)

    certs = random.sample(
        CERTIFICATIONS_BY_DOMAIN.get(domain, CERTIFICATIONS_BY_DOMAIN["backend"]),
        k=random.randint(1, 2),
    )
    company1 = random.choice(COMPANIES_WORKED)
    company2 = random.choice([c for c in COMPANIES_WORKED if c != company1])
    city = random.choice(["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"])

    years_exp = {"Junior": (0, 2), "Mid": (2, 4), "Senior": (5, 8), "Manager": (7, 12)}
    exp_range = years_exp.get(level, (2, 4))
    exp_years = random.randint(*exp_range)

    skills_str = ", ".join(skills[:6])
    skills_detail = "\n".join(f"- {s}" for s in skills)

    s3 = ', '.join(skills[:3]) if skills else domain

    domain_summaries = {
        "backend": f"Lập trình viên Backend với {exp_years} năm kinh nghiệm phát triển RESTful APIs và hệ thống microservices. Thành thạo {s3}.",
        "frontend": f"Frontend Developer với {exp_years} năm kinh nghiệm xây dựng giao diện web hiện đại, tập trung vào performance và UX. Thành thạo {s3}.",
        "data": f"Data professional với {exp_years} năm kinh nghiệm phân tích dữ liệu, xây dựng mô hình ML và data pipelines. Thành thạo {s3}.",
        "devops": f"DevOps/SRE Engineer với {exp_years} năm kinh nghiệm xây dựng hạ tầng cloud-native, CI/CD và Kubernetes. Thành thạo {s3}.",
        "qa": f"QA Engineer với {exp_years} năm kinh nghiệm kiểm thử tự động và đảm bảo chất lượng phần mềm. Thành thạo {s3}.",
        "mobile": f"Mobile Developer với {exp_years} năm kinh nghiệm phát triển ứng dụng iOS/Android hiệu suất cao. Thành thạo {s3}.",
        "ba": f"Business Analyst với {exp_years} năm kinh nghiệm phân tích yêu cầu và quản lý dự án phần mềm theo Agile. Thành thạo {s3}.",
        "healthcare": f"Nhân viên y tế với {exp_years} năm kinh nghiệm trong lĩnh vực chăm sóc sức khỏe, có kỹ năng lâm sàng vững vàng và tận tâm với bệnh nhân. Thành thạo {s3}.",
        "finance": f"Chuyên gia tài chính với {exp_years} năm kinh nghiệm phân tích tài chính, quản lý rủi ro và tư vấn đầu tư. Thành thạo {s3}.",
        "marketing": f"Chuyên viên Marketing với {exp_years} năm kinh nghiệm xây dựng thương hiệu và triển khai chiến dịch digital marketing hiệu quả. Thành thạo {s3}.",
        "hr": f"Chuyên gia Nhân sự với {exp_years} năm kinh nghiệm tuyển dụng, đào tạo và xây dựng văn hóa doanh nghiệp. Thành thạo {s3}.",
        "education": f"Nhà giáo dục với {exp_years} năm kinh nghiệm giảng dạy và phát triển chương trình học, đam mê truyền đạt kiến thức. Thành thạo {s3}.",
        "fnb": f"Chuyên gia F&B với {exp_years} năm kinh nghiệm trong ngành ẩm thực và dịch vụ khách sạn, đảm bảo chất lượng dịch vụ xuất sắc. Thành thạo {s3}.",
        "retail": f"Chuyên viên Bán lẻ với {exp_years} năm kinh nghiệm quản lý cửa hàng và phát triển doanh số, xây dựng trải nghiệm khách hàng tốt nhất. Thành thạo {s3}.",
        "construction": f"Kỹ sư Xây dựng với {exp_years} năm kinh nghiệm quản lý dự án xây dựng, đảm bảo tiến độ, chất lượng và an toàn lao động. Thành thạo {s3}.",
        "logistics": f"Chuyên gia Logistics với {exp_years} năm kinh nghiệm quản lý chuỗi cung ứng và vận hành logistics, tối ưu chi phí và đảm bảo giao hàng đúng hạn. Thành thạo {s3}.",
        "manufacturing": f"Kỹ sư Sản xuất với {exp_years} năm kinh nghiệm vận hành nhà máy và cải tiến quy trình theo Lean/Six Sigma. Thành thạo {s3}.",
    }

    summary = domain_summaries.get(domain, domain_summaries["backend"])

    sk = random.choice(skills) if skills else "công cụ chuyên ngành"
    domain_exp = {
        "backend": [
            "• Phát triển và bảo trì REST APIs phục vụ 100,000+ người dùng hàng ngày",
            f"• Thiết kế và tối ưu hóa database queries, giảm latency trung bình 40%",
            f"• Tích hợp message queue và cache layer sử dụng {sk}",
            "• Tham gia thiết kế microservices architecture và code review",
        ],
        "frontend": [
            "• Xây dựng các React components tái sử dụng cho design system nội bộ",
            "• Tối ưu Core Web Vitals, đạt điểm Lighthouse > 90 trên tất cả trang chính",
            "• Implement responsive layouts và đảm bảo cross-browser compatibility",
            "• Collaborate với UX team để improve user experience dựa trên analytics",
        ],
        "data": [
            "• Xây dựng mô hình dự đoán churn với độ chính xác 85%",
            "• Thiết kế và maintain ETL pipelines xử lý 10GB+ dữ liệu mỗi ngày",
            "• Tạo dashboards và báo cáo định kỳ cho C-level management",
            "• Implement A/B testing framework và phân tích kết quả",
        ],
        "devops": [
            "• Xây dựng và maintain Kubernetes clusters phục vụ 30+ microservices",
            "• Implement CI/CD pipelines với GitHub Actions, giảm deployment time 70%",
            "• Monitor hệ thống với Prometheus/Grafana, đảm bảo 99.9% uptime",
            "• Migrate infrastructure lên cloud, tiết kiệm 35% chi phí vận hành",
        ],
        "qa": [
            "• Xây dựng automation test framework từ đầu bằng Selenium/Playwright",
            "• Đạt coverage 80%+ cho regression test suite",
            "• Thực hiện performance testing với JMeter, phát hiện và báo cáo bottlenecks",
            "• Tham gia vào sprint planning để estimate test effort và risk assessment",
        ],
        "mobile": [
            "• Phát triển tính năng mới cho app với 1M+ active users trên App Store/Google Play",
            "• Tối ưu startup time và memory footprint, cải thiện crash rate < 0.1%",
            "• Implement push notification, deep linking và analytics tracking",
            "• Collaborate với backend team để thiết kế mobile-friendly APIs",
        ],
        "ba": [
            "• Thu thập và phân tích requirements từ 5+ business stakeholders",
            "• Viết BRD, FRD và user stories rõ ràng, giảm rework rate 30%",
            "• Facilitate sprint planning, retrospective và stakeholder review meetings",
            "• Phối hợp với UX để thiết kế user flows và wireframes",
        ],
        "healthcare": [
            "• Khám và điều trị cho 40+ bệnh nhân mỗi ngày với chất lượng chăm sóc cao",
            "• Phối hợp với ekip đa chuyên khoa để lập kế hoạch điều trị toàn diện",
            "• Tham gia đào tạo và hướng dẫn nhân viên y tế mới vào ca",
            "• Duy trì hồ sơ bệnh án điện tử chính xác và đầy đủ theo tiêu chuẩn",
        ],
        "finance": [
            "• Phân tích báo cáo tài chính và lập kế hoạch ngân sách cho đơn vị kinh doanh",
            "• Quản lý danh mục đầu tư trị giá 50 tỷ VNĐ với tỷ suất sinh lợi 12%/năm",
            "• Xây dựng mô hình tài chính và dự báo cho ban lãnh đạo ra quyết định",
            "• Thực hiện kiểm toán nội bộ và đảm bảo tuân thủ quy định pháp luật",
        ],
        "marketing": [
            "• Quản lý ngân sách marketing 2 tỷ VNĐ/năm, tối ưu ROI lên 300%",
            "• Xây dựng và thực hiện chiến dịch digital marketing đạt 5 triệu lượt tiếp cận",
            "• Tăng organic traffic 150% trong 6 tháng qua chiến lược SEO và Content",
            "• Phối hợp agency và internal team để launch 3 sản phẩm mới thành công",
        ],
        "hr": [
            "• Tuyển dụng 50+ nhân sự chất lượng cho các bộ phận mỗi năm",
            "• Thiết kế và triển khai chương trình onboarding, giảm turnover rate 25%",
            "• Xây dựng hệ thống đánh giá KPI và lộ trình phát triển career path",
            "• Tư vấn và hỗ trợ ban lãnh đạo về chiến lược nhân sự và văn hóa doanh nghiệp",
        ],
        "education": [
            "• Giảng dạy cho 200+ học viên mỗi năm, đạt tỷ lệ hài lòng 95%",
            "• Thiết kế và cải tiến chương trình học theo xu hướng giáo dục hiện đại",
            "• Tổ chức các hoạt động ngoại khóa nâng cao kỹ năng mềm cho học viên",
            "• Ứng dụng công nghệ e-learning vào giảng dạy, tăng engagement 40%",
        ],
        "fnb": [
            "• Quản lý nhà hàng doanh thu 5 tỷ VNĐ/tháng với team 30+ nhân viên",
            "• Xây dựng và đào tạo đội ngũ phục vụ chuyên nghiệp, đạt đánh giá 4.8/5 sao",
            "• Thiết kế menu theo mùa và kiểm soát food cost ở mức tối ưu 28%",
            "• Xử lý khiếu nại khách hàng và duy trì tiêu chuẩn vệ sinh an toàn thực phẩm",
        ],
        "retail": [
            "• Quản lý cửa hàng doanh thu 2 tỷ VNĐ/tháng với team 15 nhân viên",
            "• Đạt và vượt KPI doanh số 120% trong 3 quý liên tiếp",
            "• Thiết kế visual merchandising sáng tạo, tăng conversion rate 35%",
            "• Quản lý hàng tồn kho chặt chẽ, giảm tỷ lệ shrinkage xuống dưới 0.5%",
        ],
        "construction": [
            "• Quản lý dự án xây dựng trị giá 100 tỷ VNĐ, hoàn thành đúng tiến độ 100%",
            "• Giám sát chất lượng thi công, đảm bảo tuân thủ tiêu chuẩn kỹ thuật",
            "• Điều phối nhà thầu phụ và quản lý 50+ công nhân trên công trường",
            "• Kiểm soát chi phí dự án hiệu quả, tiết kiệm 8% so với dự toán ban đầu",
        ],
        "logistics": [
            "• Quản lý kho 10,000 m² với 200,000 SKU, độ chính xác tồn kho 99.8%",
            "• Tối ưu tuyến đường vận chuyển và quản lý chi phí logistics giảm 20%",
            "• Xử lý 5,000+ đơn hàng/ngày, tỷ lệ giao đúng hẹn đạt 98%",
            "• Triển khai hệ thống WMS mới, giảm thời gian xử lý đơn hàng 40%",
        ],
        "manufacturing": [
            "• Quản lý dây chuyền sản xuất 500 sản phẩm/giờ, OEE đạt mục tiêu 85%",
            "• Triển khai Lean Manufacturing, giảm lãng phí 30% và tăng năng suất 25%",
            "• Đảm bảo tỷ lệ sản phẩm đạt chất lượng 99.5%, giảm defect rate 60%",
            "• Phối hợp với bộ phận R&D cải tiến quy trình, tiết kiệm nguyên vật liệu 15%",
        ],
    }

    exp_bullets = "\n".join(domain_exp.get(domain, domain_exp["backend"]))

    domain_titles = {
        "backend": "Backend Developer", "frontend": "Frontend Developer",
        "data": "Data Analyst / Data Engineer", "devops": "DevOps Engineer",
        "qa": "QA Engineer", "mobile": "Mobile Developer",
        "ba": "Business Analyst", "healthcare": "Nhân viên Y tế",
        "finance": "Chuyên viên Tài chính", "marketing": "Marketing Specialist",
        "hr": "HR Professional", "education": "Giáo viên / Chuyên viên Giáo dục",
        "fnb": "F&B Professional", "retail": "Chuyên viên Bán lẻ",
        "construction": "Kỹ sư Xây dựng", "logistics": "Chuyên viên Logistics",
        "manufacturing": "Kỹ sư Sản xuất",
    }
    job_title_label = domain_titles.get(domain, domain.title())
    early_role = "Nhân viên / Thực tập sinh" if domain not in ("backend", "frontend", "data", "devops", "qa", "mobile", "ba") else "Junior Developer / Intern"

    text = f"""{full_name}
{job_title_label.upper()} | {level.upper()}
Email: {email} | Tel: {phone} | {city}

═══════════════════════════════════════
TÓM TẮT
{summary}

═══════════════════════════════════════
KỸ NĂNG CHUYÊN MÔN
{skills_detail}

═══════════════════════════════════════
KINH NGHIỆM LÀM VIỆC

{random.randint(grad_year, 2024)} - Nay: {level} {job_title_label} - {company1}, {city}
{exp_bullets}

{grad_year} - {grad_year + random.randint(1, 2)}: {early_role} - {company2}, {city}
• Hỗ trợ các công việc chuyên môn dưới sự hướng dẫn của người có kinh nghiệm
• Học hỏi quy trình làm việc và tích lũy kinh nghiệm thực tế
• Tham gia các dự án nhỏ và hoàn thành nhiệm vụ được giao đúng hạn

═══════════════════════════════════════
HỌC VẤN

{grad_year - 4} - {grad_year}: {university}
Chuyên ngành: {major} | GPA: {gpa}/4.0

═══════════════════════════════════════
CHỨNG CHỈ
{chr(10).join(f"• {c}" for c in certs)}

═══════════════════════════════════════
KỸ NĂNG MỀM
• Làm việc nhóm và giao tiếp hiệu quả trong môi trường Agile/Scrum
• Chủ động học hỏi, thích nghi nhanh với công nghệ mới
• Tư duy phân tích và giải quyết vấn đề
• Tiếng Anh: {random.choice(['Giao tiếp tốt', 'Đọc hiểu tốt', 'B2 IELTS', 'TOEIC 650+'])}
"""
    return text.strip()


def generate_cover_letter(full_name: str, domain: str, job_title: str) -> str:
    """Generate a realistic cover letter."""
    return (
        f"Kính gửi Phòng Nhân sự,\n\n"
        f"Tôi là {full_name}, một {domain} developer với nhiều năm kinh nghiệm. "
        f"Tôi rất hứng thú với vị trí {job_title} tại công ty bạn.\n\n"
        f"Qua quá trình làm việc, tôi đã tích lũy được kinh nghiệm thực tiễn trong lĩnh vực "
        f"{domain} và tin rằng tôi có thể đóng góp tích cực cho team của quý công ty. "
        f"Tôi là người năng động, ham học hỏi và luôn sẵn sàng thích nghi với môi trường mới.\n\n"
        f"Rất mong được có cơ hội trao đổi thêm với quý công ty.\n\n"
        f"Trân trọng,\n{full_name}"
    )
