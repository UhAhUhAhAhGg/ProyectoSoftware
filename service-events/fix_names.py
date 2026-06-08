import sys

with open('events/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_class(class_name, new_code):
    global content
    start_str = f"class {class_name}(APIView):"
    try:
        start_idx = content.index(start_str)
        next_class_idx = content.find("class ", start_idx + 10)
        if next_class_idx == -1: next_class_idx = len(content)
        content = content[:start_idx] + new_code + "\n\n" + content[next_class_idx:]
    except ValueError:
        print(f"Error: {class_name} no encontrado")
        sys.exit(1)

code_superadmin_dashboard = """class SuperAdminDashboardExportView(APIView):
    \"\"\"
    GET /api/v1/admin/dashboard/export/?export_format=csv|pdf
    Exporta el reporte consolidado de todo el sistema para el SuperAdmin.
    \"\"\"
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        compras_qs = Purchase.objects.filter(status__in=['active', 'used']).select_related('event')
        
        promotores_data = compras_qs.values('event__promoter_id').annotate(
            tickets=Coalesce(Sum('quantity'), 0),
            ingresos=Coalesce(Sum('total_price'), D('0')),
            comisiones=Coalesce(Sum('commission_amount'), D('0'))
        ).order_by('-comisiones')

        # Intentar obtener los nombres de los promotores desde service-auth
        auth_header = request.headers.get('Authorization')
        map_promotores = {}
        if auth_header:
            try:
                import requests
                from django.conf import settings
                # Si existe AUTH_SERVICE_URL o usar default
                auth_url = getattr(settings, 'AUTH_SERVICE_URL', 'http://service-auth:8000') + '/api/v1/users/promotores/'
                resp = requests.get(auth_url, headers={'Authorization': auth_header}, timeout=5)
                if resp.status_code == 200:
                    proms = resp.json()
                    map_promotores = {str(p.get('id')): p.get('nombre', 'Desconocido') for p in proms}
            except Exception:
                pass

        header = ['Promotor', 'Tickets Vendidos', 'Ingresos Brutos', 'Comisiones Plataforma']
        rows = []
        
        tot_tickets = 0
        tot_bruto = D('0')
        tot_comisiones = D('0')

        bar_data = []
        bar_labels = []

        for p in promotores_data[:15]:
            pid = str(p['event__promoter_id'])
            nombre = map_promotores.get(pid, pid[:8])
            rows.append([
                nombre,
                str(p['tickets']),
                str(p['ingresos']),
                str(p['comisiones'])
            ])
            tot_tickets += p['tickets']
            tot_bruto += p['ingresos']
            tot_comisiones += p['comisiones']
            
            if p['comisiones'] > 0:
                bar_data.append(float(p['comisiones']))
                bar_labels.append(nombre[:15])

        # Add remaining as others if > 15
        if len(promotores_data) > 15:
            for p in promotores_data[15:]:
                tot_tickets += p['tickets']
                tot_bruto += p['ingresos']
                tot_comisiones += p['comisiones']

        summary_header = ['Metrica Sistema', 'Valor Total']
        summary_rows = [
            ['Total Promotores con Ventas', str(len(promotores_data))],
            ['Total Tickets Vendidos', str(tot_tickets)],
            ['Volumen Transaccional Bruto (BOB)', str(tot_bruto)],
            ['Ingresos Netos Plataforma (Comisiones) (BOB)', str(tot_comisiones)],
        ]

        charts = []
        if bar_data:
            charts.append({'type': 'bar', 'data': bar_data, 'labels': bar_labels, 'title': 'Comisiones por Top Promotores (BOB)'})

        fmt = request.query_params.get('export_format', 'csv').lower()
        
        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response("superadmin_dashboard_report.pdf", "Reporte Consolidado del Sistema", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response("superadmin_dashboard_report.csv", header, rows, summary_header, summary_rows)"""

replace_class('SuperAdminDashboardExportView', code_superadmin_dashboard)

with open('events/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("REEMPLAZO OK")
