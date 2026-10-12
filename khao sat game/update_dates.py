import docx

replacements = {
    1: {
        'old_time': '31/08/2026 - 06/09/2026', 'new_time': '10/8/2026 - 16/8/2026',
        'old_date': '31 tháng 08 năm 2026', 'new_date': '11 tháng 08 năm 2026'
    },
    2: {
        'old_time': '07/09/2026 - 13/09/2026', 'new_time': '17/8/2026 - 23/8/2026',
        'old_date': '07 tháng 09 năm 2026', 'new_date': '18 tháng 08 năm 2026'
    },
    3: {
        'old_time': '14/09/2026 - 20/09/2026', 'new_time': '24/8/2026 - 30/8/2026',
        'old_date': '15 tháng 09 năm 2026', 'new_date': '25 tháng 08 năm 2026'
    },
    4: {
        'old_time': '24/8/2026 - 30/8/2026', 'new_time': '31/8/2026 - 06/9/2026',
        'old_date': '25 tháng 09 năm 2026', 'new_date': '01 tháng 09 năm 2026'
    },
    5: {
        'old_time': '28/09/2026 - 04/10/2026', 'new_time': '7/9/2026 - 13/9/2026',
        'old_date': '29 tháng 09 năm 2026', 'new_date': '08 tháng 09 năm 2026'
    },
    6: {
        'old_time': '05/10/2026 - 11/10/2026', 'new_time': '14/9/2026 - 20/9/2026',
        'old_date': '06 tháng 10 năm 2026', 'new_date': '15 tháng 09 năm 2026'
    },
    7: {
        'old_time': '12/10/2026 - 18/10/2026', 'new_time': '21/9/2026 - 27/9/2026',
        'old_date': '13 tháng 10 năm 2026', 'new_date': '22 tháng 09 năm 2026'
    },
    8: {
        'old_time': '19/10/2026 - 25/10/2026', 'new_time': '28/9/2026 - 4/10/2026',
        'old_date': '20 tháng 10 năm 2026', 'new_date': '29 tháng 09 năm 2026'
    }
}

def replace_text_in_doc(doc, replacements_dict):
    for p in doc.paragraphs:
        for key, value in replacements_dict.items():
            if key in p.text:
                full_text = p.text.replace(key, value)
                if len(p.runs) > 0:
                    first_run = p.runs[0]
                    bold = first_run.bold
                    italic = first_run.italic
                    underline = first_run.underline
                    font_name = first_run.font.name
                    font_size = first_run.font.size
                    
                    p.clear()
                    new_run = p.add_run(full_text)
                    new_run.bold = bold
                    new_run.italic = italic
                    new_run.underline = underline
                    new_run.font.name = font_name
                    new_run.font.size = font_size
                else:
                    p.text = full_text

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for key, value in replacements_dict.items():
                        if key in p.text:
                            full_text = p.text.replace(key, value)
                            if len(p.runs) > 0:
                                first_run = p.runs[0]
                                bold = first_run.bold
                                italic = first_run.italic
                                underline = first_run.underline
                                font_name = first_run.font.name
                                font_size = first_run.font.size
                                
                                p.clear()
                                new_run = p.add_run(full_text)
                                new_run.bold = bold
                                new_run.italic = italic
                                new_run.underline = underline
                                new_run.font.name = font_name
                                new_run.font.size = font_size
                            else:
                                p.text = full_text

for week, vals in replacements.items():
    file = fr'c:\Users\LONG\gaming-edu\khao sat game\Bao_cao_tien_do_Tuan_{week}_Nguyen_Nhat_Long.docx'
    try:
        doc = docx.Document(file)
        rep = {
            vals['old_time']: vals['new_time'],
            vals['old_date']: vals['new_date']
        }
        replace_text_in_doc(doc, rep)
        doc.save(file)
        print(f"Updated dates for week {week}")
    except Exception as e:
        print(f"Error processing week {week}: {e}")
