from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, ListFlowable, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle

source = Path(__file__).resolve().with_name('mode-d-emploi.md')
out_path = source.with_suffix('.pdf')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='FrenchBody', parent=styles['BodyText'], fontName='Helvetica', fontSize=10, leading=14, spaceAfter=6))
styles.add(ParagraphStyle(name='H1', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=18, leading=22, alignment=1, spaceAfter=12))
styles.add(ParagraphStyle(name='H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, leading=16, spaceAfter=8))
styles.add(ParagraphStyle(name='H3', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=11, leading=14, spaceAfter=6))
styles.add(ParagraphStyle(name='Quote', parent=styles['BodyText'], fontName='Helvetica-Oblique', fontSize=10, leading=14, leftIndent=18, borderLeft=1, borderColor=colors.grey, paddingLeft=8, spaceAfter=6))
styles.add(ParagraphStyle(name='MyCode', parent=styles['Code'], fontName='Courier', fontSize=8.5, leading=11, backColor=colors.HexColor('#f3f3f3'), borderColor=colors.grey, borderPadding=6, borderWidth=1, spaceBefore=6, spaceAfter=6))
styles.add(ParagraphStyle(name='Cell', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=10, alignment=1))

def md_inline(text: str) -> str:
    text = text.replace('&', '&amp;')
    text = re.sub(r'`([^`]+)`', r'<font face="Courier">\1</font>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', text)
    text = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', text)
    text = re.sub(r'<(https?://[^>]+)>', r'<a href="\1">\1</a>', text)
    # Helvetica n'a pas le glyphe « ᵉ » (33ᵉ) : on le compose en exposant.
    text = text.replace('ᵉ', '<super>e</super>')
    return text

# Courier n'a pas les traits d'arborescence : équivalents ASCII, qui gardent l'alignement.
BOX_DRAWING = str.maketrans({'├': '+', '└': '+', '─': '-', '│': '|'})

BULLET = re.compile(r'^[-*]\s+')
NUMBERED = re.compile(r'^\d+\.\s+')

def list_items(i: int, marker: re.Pattern) -> tuple[list[str], int]:
    """Éléments d'une liste Markdown, lignes de continuation indentées comprises."""
    items = []
    while i < len(lines) and marker.match(lines[i].strip()):
        item = [marker.sub('', lines[i].strip(), count=1)]
        i += 1
        while i < len(lines) and lines[i][:1] in (' ', '\t') and lines[i].strip() and not marker.match(lines[i].strip()):
            item.append(lines[i].strip())
            i += 1
        items.append(' '.join(item))
    return items, i

lines = source.read_text(encoding='utf-8').splitlines()
story = []

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    if not stripped:
        i += 1
        continue

    if stripped.startswith('```'):
        code_lines = []
        i += 1
        while i < len(lines) and not lines[i].strip().startswith('```'):
            code_lines.append(lines[i])
            i += 1
        if i < len(lines):
            i += 1
        story.append(KeepTogether(Preformatted('\n'.join(code_lines).translate(BOX_DRAWING), styles['MyCode'])))
        continue

    if stripped.startswith('> '):
        quote_lines = []
        while i < len(lines) and lines[i].strip().startswith('> '):
            quote_lines.append(lines[i].strip()[2:])
            i += 1
        story.append(Paragraph(md_inline(' '.join(quote_lines)), styles['Quote']))
        continue

    if stripped.startswith('|'):
        rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            raw = lines[i].strip()
            cells = [c.strip() for c in raw.strip('|').split('|')]
            rows.append(cells)
            i += 1
        if len(rows) > 1 and all(re.fullmatch(r':?-+:?', c.strip()) for c in rows[1]):
            rows = rows[:1] + rows[2:]
        if rows:
            col_count = max(len(r) for r in rows)
            rendered = []
            for row in rows:
                padded = row + [''] * (col_count - len(row))
                rendered.append([Paragraph(md_inline(cell), styles['Cell']) for cell in padded])
            table = Table(rendered, colWidths=[(A4[0] - 36 * mm) / col_count for _ in range(col_count)])
            table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(table)
            story.append(Spacer(1, 8))
        continue

    if stripped.startswith('## '):
        story.append(Paragraph(md_inline(stripped[3:]), styles['H2']))
        i += 1
        continue

    if stripped.startswith('### '):
        story.append(Paragraph(md_inline(stripped[4:]), styles['H3']))
        i += 1
        continue

    if stripped.startswith('# '):
        story.append(Paragraph(md_inline(stripped[2:]), styles['H1']))
        i += 1
        continue

    if BULLET.match(stripped):
        items, i = list_items(i, BULLET)
        story.append(ListFlowable([Paragraph(md_inline(item), styles['FrenchBody']) for item in items], bulletType='bullet', bulletText='•', leftIndent=18, spaceBefore=4, spaceAfter=6))
        continue

    if NUMBERED.match(stripped):
        items, i = list_items(i, NUMBERED)
        story.append(ListFlowable([Paragraph(md_inline(item), styles['FrenchBody']) for item in items], bulletType='1', bulletFormat='%s.', leftIndent=18, spaceBefore=4, spaceAfter=6))
        continue

    para = [stripped]
    i += 1
    while i < len(lines):
        next_line = lines[i].strip()
        if not next_line:
            i += 1
            break
        if next_line.startswith('#') or next_line.startswith('- ') or next_line.startswith('* ') or next_line.startswith('> ') or next_line.startswith('|') or next_line.startswith('```') or re.match(r'^\d+\.\s', next_line):
            break
        para.append(next_line)
        i += 1
    story.append(Paragraph(md_inline(' '.join(para)), styles['FrenchBody']))

pdf = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
pdf.build(story)
print(f'Generated PDF: {out_path}')
print(f'Size: {out_path.stat().st_size} bytes')
