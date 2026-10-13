import zipfile
import xml.etree.ElementTree as ET
import glob

out = open('reports_content.txt', 'w', encoding='utf-8')
files = glob.glob(r'c:\Users\LONG\gaming-edu\khao sat game\Bao_cao_tien_do_Tuan_*.docx')
files.sort()

for f in files:
    out.write(f'--- {f} ---\n')
    try:
        doc = zipfile.ZipFile(f)
        xml_content = doc.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        text = ''.join((node.text + ' ') if node.text else '' for node in tree.iter() if node.tag.endswith('t'))
        out.write(text + '\n')
    except Exception as e:
        out.write(str(e) + '\n')
out.close()
