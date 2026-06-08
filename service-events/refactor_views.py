import sys

with open('events/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "def _csv_response(filename, header, rows):"
end_marker = "class ExportEventBuyersView(APIView):"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Makers not found")
    sys.exit(1)

replacement = """
import unicodedata

def sanitize_text(text):
    if text is None: return ""
    if not isinstance(text, str): return str(text)
    # Convert special chars like 'í' to 'i'
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')

def _csv_response(filename, header, rows, summary_header=None, summary_rows=None):
    \"\"\"Genera un HttpResponse con Content-Type text/csv.\"\"\"
    import csv
    from django.http import HttpResponse

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('\\ufeff')          # BOM UTF-8 para compatibilidad con Excel
    writer = csv.writer(response)
    writer.writerow(header)
    for r in rows:
        writer.writerow([sanitize_text(c) for c in r])
        
    if summary_header and summary_rows:
        writer.writerow([])
        writer.writerow([])
        writer.writerow(['--- RESUMEN ---'])
        writer.writerow(summary_header)
        for r in summary_rows:
            writer.writerow([sanitize_text(c) for c in r])

    return response


def _pdf_response(filename, title, subtitle, header, rows, summary_header=None, summary_rows=None, charts_data=None):
    \"\"\"
    Genera un HttpResponse con Content-Type application/pdf usando ReportLab.
    Crea un documento con título, subtítulo, tabla de datos y gráficos.
    \"\"\"
    import io
    from django.http import HttpResponse
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.graphics.shapes import Drawing, String
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Título y subtítulo
    elements.append(Paragraph(sanitize_text(title), styles['Title']))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(sanitize_text(subtitle), styles['Normal']))
    elements.append(Spacer(1, 0.6 * cm))

    if charts_data:
        for cdata in charts_data:
            d = Drawing(400, 200)
            d.add(String(200, 180, sanitize_text(cdata.get('title', '')), textAnchor='middle', fontSize=12))

            if cdata['type'] == 'pie':
                pc = Pie()
                pc.x = 125
                pc.y = 20
                pc.width = 140
                pc.height = 140
                try:
                    pc.data = [float(x) for x in cdata['data']]
                except:
                    pc.data = [0 for x in cdata['data']]
                pc.labels = [sanitize_text(l) for l in cdata['labels']]
                pc.sideLabels = 1
                d.add(pc)
            elif cdata['type'] == 'bar':
                bc = VerticalBarChart()
                bc.x = 50
                bc.y = 20
                bc.height = 120
                bc.width = 300
                try:
                    bc.data = [[float(x) for x in cdata['data']]]
                except:
                    bc.data = [[0 for x in cdata['data']]]
                bc.categoryAxis.categoryNames = [sanitize_text(l) for l in cdata['labels']]
                bc.valueAxis.valueMin = 0
                d.add(bc)

            elements.append(d)
            elements.append(Spacer(1, 0.5 * cm))

    def make_table(th, tr):
        table_data = [th] + [[sanitize_text(cell) for cell in row] for row in tr]
        col_count = len(th)
        available_width = landscape(A4)[0] - 3 * cm
        col_width = available_width / col_count

        t = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#EFF6FF')]),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        return t

    elements.append(make_table(header, rows))

    if summary_header and summary_rows:
        elements.append(Spacer(1, 1 * cm))
        elements.append(Paragraph("Resumen", styles['Heading3']))
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(make_table(summary_header, summary_rows))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write(pdf_bytes)
    return response


"""

new_content = content[:start_idx] + replacement + content[end_idx:]

with open('events/views.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("REEMPLAZO OK")
