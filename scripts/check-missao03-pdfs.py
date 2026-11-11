"""Independent comparison of every mural cell exported by Electron (Poppler required).
Uses coordinates and the saved generated project, without production report helpers.
"""
import json, subprocess, xml.etree.ElementTree as ET
from pathlib import Path
root = Path(__file__).resolve().parents[1]
lab = root / 'artifacts/missao03'
ns = {'h': 'http://www.w3.org/1999/xhtml'}
results = []
for size in ['pequena', 'media', 'grande']:
    p = json.loads((lab / f'{size}-desktop-gerada.json').read_text())
    xml = subprocess.check_output(['pdftotext', '-bbox', str(lab / f'{size}-quadro.pdf'), '-'])
    pages = [page.findall('h:word', ns) for page in ET.fromstring(xml).findall('.//h:page', ns)]
    subjects = {d['id']: d['sigla'] for d in p['disciplinas']}
    teachers = {d['id']: d['sigla'] for d in p['professores']}
    lessons = {(a['turmaId'], a['diaSemana'], a['tempoNumero']): a for a in p['gradeHorario']}
    checks = 0
    for c in p['turmas']:
        anchors = [(words, w) for words in pages for w in words if w.text == '(' + c['sigla'] + ')']
        assert len(anchors) == 1, (size, c['sigla'], 'missing/duplicate class')
        words, anchor = anchors[0]
        y = float(anchor.attrib['yMin'])
        cells = [w for w in words if float(w.attrib['xMin']) > 130.39]
        subject_y = max(float(w.attrib['yMin']) for w in cells if y-20 < float(w.attrib['yMin']) < y-.2)
        row = lambda level: [w.text for w in sorted(cells, key=lambda w: float(w.attrib['xMin'])) if abs(float(w.attrib['yMin'])-level) < .2]
        turno = next(t for t in p['turnos'] if t['id'] == c['turnoId'])
        expected_subjects, expected_teachers = [], []
        for day in p['diasLetivos']:
            for time in range(1, turno['temposCount']+1):
                a = lessons[(c['id'], day, time)]
                expected_subjects.append(subjects[a['disciplinaId']])
                expected_teachers.append(teachers[a['professorId']])
        assert row(subject_y) == expected_subjects, (size, c['sigla'], 'subjects')
        assert row(y) == expected_teachers, (size, c['sigla'], 'teachers')
        checks += len(expected_subjects)*2
    results.append({'size': size, 'pages': len(pages), 'fieldsCompared': checks, 'passed': True})
(lab / 'pdf-comparison.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
