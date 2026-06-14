"""Quét MỌI cột text của MỌI bảng tìm mojibake bằng marker-substring
(bắt cả chuỗi trộn lẫn lộn, không chỉ chuỗi mojibake thuần)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import inspect, text
from app.db.database import SessionLocal

# Chỉ dùng mảnh 2 ký tự KHÔNG nhập nhằng (tránh false-positive với chữ Việt hợp
# lệ như "Â"/"Ã"/"Ä" đứng một mình — vd "châu Âu").
MARKERS = ["Ã¡", "Ã ", "Ã£", "áº", "á»", "Ä‘", "Æ°", "Ä©", "Ãª", "Ã´", "Ã­",
           "Ã³", "Ãº", "Ã½", "Ã©", "Ã¨", "Ã²", "Ã¬", "Ã¹", "â€", "Ä\x90",
           "Ã‚", "Ã\xa0", "Ã\xad", "Æ¡"]


def has(s):
    return isinstance(s, str) and any(m in s for m in MARKERS)


def main():
    db = SessionLocal()
    try:
        insp = inspect(db.bind)
        grand = 0
        for t in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns(t)
                    if str(c["type"]).upper().startswith(("VARCHAR", "TEXT", "STRING", "CHAR"))]
            if not cols:
                continue
            sel = ", ".join(f'"{c}"' for c in cols)
            try:
                rows = db.execute(text(f'SELECT {sel} FROM "{t}"')).fetchall()
            except Exception:
                continue
            per = {c: 0 for c in cols}
            for r in rows:
                for c, v in zip(cols, r):
                    if has(v):
                        per[c] += 1
            for c, n in per.items():
                if n:
                    print(f"{t}.{c}: {n} rows")
                    grand += n
        print(f"--- TỔNG ô mojibake: {grand} ---")
    finally:
        db.close()


if __name__ == "__main__":
    main()
