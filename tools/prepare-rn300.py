"""Read an RN300 XLSX export without relying on its worksheet dimension metadata."""
import argparse
import collections
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ESSAY_POINTS = {0: 0, 1: 0.1, 2: 0.2, 3: 0.4, 4: 0.6, 5: 0.8, 6: 1}

def read_rows(source):
    with zipfile.ZipFile(source) as archive:
        strings = [''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in sheet.findall('s:sheetData/s:row', NS):
            values = {}
            for cell in row.findall('s:c', NS):
                column = re.match(r'[A-Z]+', cell.attrib['r'])[0]
                value = cell.find('s:v', NS)
                text = value.text if value is not None else None
                if cell.attrib.get('t') == 's' and text is not None:
                    text = strings[int(text)]
                values[column] = text
            rows.append((int(row.attrib['r']), values))
        return rows

def number(value):
    if value is None or str(value).strip() in ('', '-'):
        return None
    return float(value)

def prepare(source, cohort, exam):
    rows = read_rows(source)
    headers = {value.replace('\n', '').strip(): column for column, value in rows[0][1].items() if value}
    required = ['班級', '座號', '姓名', '作文級分', '作文積分', '總積分', '國文等級', '英語等級', '數學等級', '社會等級', '自然等級']
    if any(key not in headers for key in required):
        raise ValueError('報表表頭不符合 RN300 格式')
    students = []
    incomplete = []
    missing_essay = []
    ids = set()
    subject_names = {'國': '國文', '英': '英語', '數': '數學', '社': '社會', '自': '自然'}
    grade_scores = {'A++':7, 'A+':6, 'A':5, 'B++':4, 'B+':3, 'B':2, 'C':1}
    for row_number, cells in rows[1:]:
        get = lambda key: cells.get(headers[key])
        if not get('姓名'):
            raise ValueError(f'第{row_number}列缺少姓名')
        class_name = str(int(get('班級')))
        seat = str(int(get('座號')))
        student_id = f'{cohort}-{class_name}-{seat.zfill(2)}'
        if student_id in ids:
            raise ValueError(f'第{row_number}列班級座號重複')
        ids.add(student_id)
        result = {}
        for key, label in subject_names.items():
            raw = get(label + '等級')
            match = re.search(r'\(([ABC](?:\+\+|\+)?)\)', raw or '')
            if raw and not match:
                raise ValueError(f'第{row_number}列{label}等級無法辨識')
            result[key] = match[1] if match else None
        essay = number(get('作文級分'))
        points = number(get('作文積分'))
        if essay is not None:
            if essay not in ESSAY_POINTS or points != ESSAY_POINTS[essay]:
                raise ValueError(f'第{row_number}列作文級分與積分不一致')
            essay = int(essay)
        elif points is not None:
            raise ValueError(f'第{row_number}列只有作文積分而無級分')
        else:
            missing_essay.append(row_number)
        result.update({'作': essay, '作文原始積分': points, '總積分': number(get('總積分'))})
        if all(result[key] is not None for key in subject_names) and points is not None:
            calculated = sum(grade_scores[result[key]] for key in subject_names) + points
            if result['總積分'] is None or abs(calculated - result['總積分']) > 1e-8:
                raise ValueError(f'第{row_number}列總積分不一致')
        else:
            incomplete.append(row_number)
        students.append({'id':student_id, '級別':cohort, '姓名':get('姓名'), '座號':seat,
                         '班級':class_name, '九年級班級':class_name, '高一班級':None,
                         '組別':'未分組', '九年級組別':None, '最終直升':None,
                         '額外分組':None, exam:result, '來源列':row_number})
    data = {'schemaVersion':1, 'cohort':cohort, 'academicYear':None, 'exams':[exam],
            'essayScale':'grade6', 'display':{'hiddenDashboardClasses':[], 'hiddenDashboardGroups':['A組']},
            'source':{'file':source.name, 'sheet':'Sheet0', 'sha256':hashlib.sha256(source.read_bytes()).hexdigest()},
            'students':students}
    report = {'students':len(students), 'classes':dict(collections.Counter(s['班級'] for s in students)),
              'essayGrades':dict(collections.Counter(str(s[exam]['作']) for s in students)),
              'missingEssayRows':missing_essay, 'incompleteSubjectRows':incomplete,
              'validTotals':sum(s[exam]['總積分'] is not None for s in students)}
    return data, report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('cohort')
    parser.add_argument('exam',choices=['一模','二模','三模','四模','會考'])
    parser.add_argument('output',type=Path)
    args = parser.parse_args()
    data, report = prepare(args.source,args.cohort,args.exam)
    args.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=True))
