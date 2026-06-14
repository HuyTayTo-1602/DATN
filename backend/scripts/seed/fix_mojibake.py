"""
Phát hiện & sửa mojibake (double-encoded UTF-8) trong các file JSON seed.

Nguyên nhân: một số entry trong job_templates.json (và có thể file khác) đã bị
encode 2 lần — text UTF-8 đúng bị diễn giải nhầm thành cp1252 rồi lưu lại thành
UTF-8, tạo ra chuỗi kiểu "Kiá»ƒm toÃ¡n viÃªn" thay vì "Kiểm toán viên".

Cách sửa: với mỗi chuỗi mojibake, đảo ngược: s.encode('cp1252').decode('utf-8').
Chỉ áp dụng khi round-trip thành công VÀ kết quả giảm dấu hiệu mojibake (an toàn
với các entry vốn đã đúng — bỏ qua, không đụng vào).

Chạy:  python scripts/seed/fix_mojibake.py            # chỉ báo cáo (dry-run)
       python scripts/seed/fix_mojibake.py --write    # ghi đè file đã sửa
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FILES = ["job_templates.json", "company_templates.json",
         "locations_vn.json", "skills_catalog.json"]

MARKERS = ["Ã", "Â", "á»", "áº", "â€", "Æ", "Ä", "Ãª", "Ã´", "Ã¡"]


def moji_score(s: str) -> int:
    return sum(s.count(m) for m in MARKERS)


def try_fix(s: str) -> str:
    """Trả về chuỗi đã sửa nếu round-trip cp1252->utf-8 thành công và bớt mojibake;
    ngược lại trả về nguyên bản."""
    if moji_score(s) == 0:
        return s
    try:
        fixed = s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s
    # chỉ chấp nhận nếu thực sự bớt dấu hiệu mojibake
    if moji_score(fixed) < moji_score(s):
        return fixed
    return s


def walk(obj):
    """Đệ quy sửa toàn bộ string trong cấu trúc JSON. Trả về (obj_mới, số_chuỗi_sửa)."""
    fixed_count = 0
    if isinstance(obj, str):
        new = try_fix(obj)
        return new, (1 if new != obj else 0)
    if isinstance(obj, list):
        out = []
        for v in obj:
            nv, c = walk(v)
            out.append(nv)
            fixed_count += c
        return out, fixed_count
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            nk, ck = walk(k)
            nv, cv = walk(v)
            out[nk] = nv
            fixed_count += ck + cv
        return out, fixed_count
    return obj, 0


def main(write: bool):
    for fn in FILES:
        path = os.path.join(DATA_DIR, fn)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        fixed, count = walk(data)
        print(f"{fn}: {count} chuỗi mojibake cần sửa")
        if write and count:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(fixed, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print(f"  -> đã ghi {fn}")


if __name__ == "__main__":
    main(write="--write" in sys.argv)
