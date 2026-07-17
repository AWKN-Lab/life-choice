import os
import tempfile

# 测试pdf2image
try:
    from pdf2image import convert_from_path
    print('pdf2image: OK')
except ImportError as e:
    print(f'pdf2image: FAIL - {e}')

# 测试poppler
try:
    import subprocess
    result = subprocess.run(['pdftoppm', '-v'], capture_output=True, text=True)
    print(f'poppler: {result.stdout[:50] if result.stdout else result.stderr[:50]}')
except FileNotFoundError:
    print('poppler: NOT FOUND')

# 检查环境变量
print(f'\nPATH contains poppler: any("poppler" in p.lower() for p in os.environ.get("PATH", "").split(os.pathsep))')