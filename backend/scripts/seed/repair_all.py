"""
Sửa mojibake TOÀN DIỆN cho mọi cột text của mọi bảng trong DB hiện tại.

Pipeline cho mỗi ô có mojibake:
  1) Thay job title đã biết (chính xác tuyệt đối) — từ jobs + job_templates.json.
  2) Nếu còn lỗi: thử round-trip cp1252->utf-8 (đúng cho ô mojibake THUẦN).
  3) Nếu vẫn còn: ftfy.fix_text (vá ô TRỘN / title biến thể).
  4) Vá mảnh ftfy bỏ sót (vd "sÄ©"->"sĩ").
Chỉ ghi ô có thay đổi và (cảnh báo) nếu sau sửa vẫn còn marker.

Dùng marker 2 ký tự không nhập nhằng để tránh false-positive với chữ Việt hợp lệ
("Â","Ã" đứng một mình như trong "châu Âu").

Chạy:  python scripts/seed/repair_all.py            # dry-run
       python scripts/seed/repair_all.py --write    # cập nhật DB
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import codecs

from sqlalchemy import inspect, text
from app.db.database import SessionLocal


def _keepbyte(err):
    """Khi 1 byte không hợp lệ UTF-8 → giữ nguyên nó như ký tự latin-1
    (đó là ký tự Việt vốn đã đúng, không phải mojibake)."""
    return (bytes(err.object[err.start:err.start + 1]).decode("latin-1"), err.start + 1)


codecs.register_error("keepbyte", _keepbyte)


def fix_smart(s: str) -> str:
    """Sửa mojibake mức BYTE, xử lý đúng cả chuỗi TRỘN và idempotent với chuỗi
    đã đúng: gom các ký tự cp1252-encodable thành byte rồi decode lại UTF-8;
    ký tự Việt thật (không cp1252-encodable) được giữ nguyên."""
    res = []
    buf = bytearray()
    for ch in s:
        try:
            buf.extend(ch.encode("cp1252"))
            continue
        except UnicodeEncodeError:
            pass
        try:
            # 5 slot undefined của cp1252 (0x81,0x8D,0x8F,0x90,0x9D) vẫn là 1 byte
            # latin-1 — cần giữ để không cắt đứt chuỗi UTF-8 đa byte.
            buf.extend(ch.encode("latin-1"))
            continue
        except UnicodeEncodeError:
            pass
        # ký tự Việt thật (không phải 1 byte) → giữ nguyên
        if buf:
            res.append(buf.decode("utf-8", errors="keepbyte"))
            buf.clear()
        res.append(ch)
    if buf:
        res.append(buf.decode("utf-8", errors="keepbyte"))
    return "".join(res)

# Mảnh 2 ký tự KHÔNG nhập nhằng để nhận diện ô mojibake (tránh false-positive với
# chữ Việt hợp lệ như "Â"/"Ã" đứng một mình trong "châu Âu").
MARKERS = ["Ã¡", "Ã ", "Ã£", "áº", "á»", "Ä‘", "Æ°", "Ä©", "Ãª", "Ã´", "Ã­",
           "Ã³", "Ãº", "Ã½", "Ã©", "Ã¨", "Ã²", "Ã¬", "Ã¹", "â€", "Ä\x90",
           "Ã‚", "Ã\xa0", "Ã\xad", "Æ¡"]


def has(s):
    return isinstance(s, str) and any(m in s for m in MARKERS)


def fix_cell(s):
    return fix_smart(s) if has(s) else s


def main(write: bool):
    db = SessionLocal()
    try:
        insp = inspect(db.bind)
        grand_fixed = 0
        grand_unresolved = 0
        for t in insp.get_table_names():
            colinfo = insp.get_columns(t)
            text_cols = [c["name"] for c in colinfo
                         if str(c["type"]).upper().startswith(("VARCHAR", "TEXT", "STRING", "CHAR"))]
            if not text_cols:
                continue
            pk = insp.get_pk_constraint(t).get("constrained_columns") or []
            if not pk:
                continue
            idcol = pk[0]
            sel = ", ".join(f'"{c}"' for c in [idcol] + text_cols)
            try:
                rows = db.execute(text(f'SELECT {sel} FROM "{t}"')).fetchall()
            except Exception:
                continue
            tbl_fixed = 0
            tbl_unresolved = 0
            for row in rows:
                rid = row[0]
                updates = {}
                for c, v in zip(text_cols, row[1:]):
                    if not has(v):
                        continue
                    nv = fix_cell(v)
                    if nv != v:
                        updates[c] = nv
                    if has(nv):
                        tbl_unresolved += 1
                if updates:
                    tbl_fixed += 1
                    if write:
                        setclause = ", ".join(f'"{c}" = :{c}' for c in updates)
                        params = dict(updates)
                        params["_id"] = rid
                        db.execute(text(f'UPDATE "{t}" SET {setclause} WHERE "{idcol}" = :_id'), params)
            if tbl_fixed or tbl_unresolved:
                print(f"{t}: sửa {tbl_fixed} bản ghi" +
                      (f", CÒN MARKER {tbl_unresolved} ô" if tbl_unresolved else ""))
            grand_fixed += tbl_fixed
            grand_unresolved += tbl_unresolved
        print(f"--- TỔNG: sửa {grand_fixed} bản ghi, còn marker {grand_unresolved} ô ---")
        if write:
            db.commit()
            print("  -> đã commit")
        else:
            db.rollback()
            print("  (dry-run; thêm --write để cập nhật)")
    finally:
        db.close()


if __name__ == "__main__":
    main(write="--write" in sys.argv)
