import pandas as pd
import sys
import glob

# find the excel file
excel_file = glob.glob("*.xlsx")[0]

xl = pd.ExcelFile(excel_file)
with open('output.txt', 'w', encoding='utf-8') as f:
    for sheet in xl.sheet_names:
        f.write('--- Sheet: ' + sheet + ' ---\n')
        f.write(pd.read_excel(xl, sheet).to_string())
        f.write('\n\n')
