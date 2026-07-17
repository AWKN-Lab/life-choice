import sys
import json
import time
from pathlib import Path
from datetime import datetime

import fitz
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import pytesseract
import io
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

SRC_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇")
OUT_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇-md")
OUT_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_FILE = OUT_DIR / "_progress.json"

RENDER_DPI = 40
MAX_WIDTH = 1600
LANG = "chi_tra+chi_sim"

BATCH1 = ["中州派紫微斗数初级讲义.pdf", "依婷紫微斗数讲课记录.pdf", "紫微斗数精奥.pdf"]
BATCH2 = ["中州派紫微斗数深造讲义上.pdf", "中州派紫微斗数深造讲义下.pdf", "亲子难题紫微有解.pdf", "初学紫微斗数.pdf", "劝学斋紫微高阶之五.pdf", "图解紫微斗数下推理卷.pdf", "学习紫微斗数的第一本书.pdf", "开馆人紫微斗数1.pdf", "开馆人紫微斗数2.pdf", "开馆人紫微斗数3.pdf", "开馆人紫微斗数4.pdf", "慧心斋主：紫微斗数开发潜能.pdf", "慧心斋主：紫微斗数看婚姻.pdf", "慧心斋主：紫微斗数趋吉避凶法.pdf", "斗数与人生.pdf", "斗数卦理应用一.pdf", "斗数卦理应用三.pdf", "斗数卦理应用二.pdf", "斗数疑难100问答古典篇.pdf", "斗数看人际关系.pdf", "斗数真诀五.pdf", "斗数真诀六.pdf", "斗数真诀四.pdf", "斗数论田宅.pdf", "正统飞星紫微斗数.pdf", "煮酒论紫微上.pdf", "煮酒论紫微下.pdf", "王亭之紫微斗数全集一.pdf", "王亭之紫微斗数全集三.pdf", "王亭之紫微斗数全集二.pdf", "王亭之紫微斗数全集五.pdf", "王亭之紫微斗数全集六.pdf", "王亭之紫微斗数全集四.pdf", "简易紫微斗数技巧篇.pdf", "紫云论斗数星曜赋性一.pdf", "紫云论斗数星曜赋性三.pdf", "紫云论斗数星曜赋性二.pdf", "紫云论斗数星曜赋性四.pdf", "紫微发秘.pdf", "紫微启示录.pdf", "紫微命谱上.pdf", "紫微命谱下.pdf", "紫微四化一学就通上.pdf", "紫微四化一学就通下.pdf", "紫微四化星.pdf", "紫微四化星附册.pdf", "紫微国宝.pdf", "紫微堂奥一.pdf", "紫微奇径.pdf", "紫微手相学.pdf", "紫微探真.pdf", "紫微斗数.pdf", "紫微斗数入门与精要合璧.pdf", "紫微斗数命例真解三百例上.pdf", "紫微斗数命例真解三百例下.pdf", "紫微斗数命例真解三百例中.pdf", "紫微斗数命理研究上下.pdf", "紫微斗数命运分析.pdf", "紫微斗数命运分析实例篇.pdf", "紫微斗数命运分析格局篇.pdf", "紫微斗数四系大辞.pdf", "紫微斗数大突破.pdf", "紫微斗数太微.pdf", "紫微斗数太微命判.pdf", "紫微斗数导读入门篇.pdf", "紫微斗数导读独身篇.pdf", "紫微斗数导读进阶篇.pdf", "紫微斗数教科书.pdf", "紫微斗数断命法.pdf", "紫微斗数星曜赋性五.pdf", "紫微斗数流年提要.pdf", "紫微斗数看钱财.pdf", "紫微斗数秘仪抄本.pdf", "紫微斗数精成上.pdf", "紫微斗数精成下.pdf", "紫微斗数精析掌诀星曜篇.pdf", "紫微斗数补遗.pdf", "紫微斗数解密.pdf", "紫微斗数论命技巧及实例解析上.pdf", "紫微斗数论命技巧及实例解析下.pdf", "紫微斗数论命技巧及实例解析中.pdf", "紫微斗数误（悟）我十八年.pdf", "紫微斗数速判千金诀.pdf", "紫微斗数高级理论大全.pdf", "紫微算运.pdf", "紫微讲义.pdf", "紫微随笔亨集.pdf", "紫微随笔元集.pdf", "紫微随笔利集.pdf", "紫微随笔贞集.pdf", "紫微面相学.pdf", "翻书就能算紫微.pdf", "赖铭贤斗数解秘.pdf", "赖铭贤紫微问答录推论篇.pdf", "陆斌兆紫微斗数讲义上.pdf", "陆斌兆紫微斗数讲义下.pdf", "陆斌兆紫微斗数讲义中.pdf", "飞星紫微斗数.pdf", "飞星紫微斗数专论四化.pdf", "飞星紫微斗数十二宫.pdf", "飞星紫微斗数生命解码.pdf", "飞星紫微斗数说命上.pdf", "飞星紫微斗数说命下.pdf"]
BATCH3 = ["劝学斋紫微初阶.pdf", "劝学斋紫微进阶.pdf", "劝学斋紫微高阶之一.pdf", "劝学斋紫微高阶之三.pdf", "劝学斋紫微高阶之二.pdf", "劝学斋紫微高阶之四.pdf", "图解紫微斗数上命理卷.pdf", "斗数真诀一.pdf", "斗数真诀三.pdf", "斗数真诀二.pdf", "紫微斗数考证.pdf", "紫微斗数预测疾病.pdf", "紫微斗数预测解说.pdf", "赖铭贤紫微答问录.pdf"]


def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": {}, "failed": {}, "started_at": None, "done_pages": 0}


def save(p):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)


def preprocess(pix):
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")
    if img.width > MAX_WIDTH:
        r = MAX_WIDTH / img.width
        img = img.resize((MAX_WIDTH, int(img.height * r)), Image.LANCZOS)
    arr = np.array(img)
    return Image.fromarray(((arr > 128) * 255).astype(np.uint8))


def process_batch(batch_name, file_list, psm):
    progress = load_progress()
    if not progress["started_at"]:
        progress["started_at"] = datetime.now().isoformat()
    save(progress)

    total = len(file_list)
    success = 0
    failed = 0
    batch_start = time.time()

    for idx, fname in enumerate(file_list):
        pdf_path = SRC_DIR / fname
        out_path = OUT_DIR / (pdf_path.stem + ".md")

        if fname in progress["completed"]:
            print(f"[{idx+1}/{total}] SKIP - {fname}")
            continue

        print(f"[{idx+1}/{total}] {fname} ... ", end="", flush=True)
        t0 = time.time()

        try:
            doc = fitz.open(pdf_path)
            pages = len(doc)
            lines = [f"# {pdf_path.stem}\n"]

            for p in range(pages):
                page = doc[p]
                mat = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
                pix = page.get_pixmap(matrix=mat)
                img_bin = preprocess(pix)
                if psm == "text":
                    text = doc[p].get_text().strip()
                    if not text:
                        text = pytesseract.image_to_string(img_bin, lang=LANG, config="--psm 4").strip()
                else:
                    config = f"--psm {psm} -c preserve_interword_spaces=1"
                    text = pytesseract.image_to_string(img_bin, lang=LANG, config=config).strip()
                lines.append(f"---\n\n## 第 {p + 1} 页\n\n{text}\n")
                if (p + 1) % 20 == 0:
                    print(f"\n    页 {p+1}/{pages}...", end="", flush=True)

            doc.close()
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

            elapsed = time.time() - t0
            progress["completed"][fname] = {
                "pages": pages, "elapsed_s": round(elapsed, 1),
                "time": datetime.now().isoformat()
            }
            progress["done_pages"] = progress.get("done_pages", 0) + pages
            if fname in progress["failed"]:
                del progress["failed"][fname]
            success += 1
            print(f"\r[{idx+1}/{total}] OK {pages}页 {elapsed:.0f}s - {fname}")
        except Exception as e:
            elapsed = time.time() - t0
            progress["failed"][fname] = {
                "error": str(e), "elapsed_s": round(elapsed, 1),
                "time": datetime.now().isoformat()
            }
            failed += 1
            print(f"\r[{idx+1}/{total}] FAIL {elapsed:.0f}s - {fname}: {e}")

        save(progress)

    elapsed = time.time() - batch_start
    print(f"\n[{batch_name}] 完成: {success}成功/{failed}失败, {elapsed/60:.0f}分钟")
    return success, failed


def main():
    print("=" * 60)
    print("  紫微斗数 PDF → MD 串行三批转换")
    print(f"  DPI: {RENDER_DPI}, 最大宽度: {MAX_WIDTH}px, 语言: {LANG}")
    print("=" * 60)

    print("\n>>> 第一批：文本提取（3本）<<<")
    process_batch("BATCH1", BATCH1, "text")

    print("\n>>> 第二批：标准OCR横版 PSM=4（103本）<<<")
    process_batch("BATCH2", BATCH2, "4")

    print("\n>>> 第三批：竖版/繁体 PSM=11（14本）<<<")
    process_batch("BATCH3", BATCH3, "11")

    progress = load_progress()
    progress["finished_at"] = datetime.now().isoformat()
    save(progress)

    print("\n" + "=" * 60)
    print(f"  全部完成! 成功: {len(progress['completed'])}, "
          f"失败: {len(progress['failed'])}, "
          f"总页数: {progress['done_pages']}")
    print(f"  输出: {OUT_DIR}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
