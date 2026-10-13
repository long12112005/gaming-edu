import glob
import os
from docx2pdf import convert

files = glob.glob(r'c:\Users\LONG\gaming-edu\khao sat game\Bao_cao_tien_do_Tuan_*.docx')
files.sort()

for doc_path in files:
    try:
        # docx2pdf will automatically output a .pdf with the same name
        convert(doc_path)
        print(f"Converted {doc_path} to PDF.")
    except Exception as e:
        print(f"Error converting {doc_path}: {e}")
