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

# ----------------- PromotorDashboardExportView -----------------
code_promotor_dashboard = """class PromotorDashboardExportView(APIView):
    \"\"\"
    GET /api/v1/promotor/dashboard/export/?export_format=csv|pdf
    Exporta el resumen de todos los eventos del promotor.
    \"\"\"
    permission_classes = [IsPromotor]

    def get(self, request):
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        promotor_id = payload.get('user_id')

        eventos = Event.objects.filter(promoter_id=promotor_id)
        
        header = ['Evento', 'Fecha', 'Ubicacion', 'Estado', 'Capacidad', 'Tickets Vendidos', 'Ingresos Brutos', 'Comisiones', 'Ingresos Netos']
        rows = []
        
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        tot_tickets_global = 0
        tot_bruto = D('0')
        tot_comision = D('0')
        tot_neto = D('0')

        bar_data_neto = []
        bar_labels = []

        pie_data_status = {}

        for ev in eventos:
            compras_qs = Purchase.objects.filter(event=ev, status__in=['active', 'used'])
            total_tickets = compras_qs.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            
            try:
                aggs = compras_qs.aggregate(
                    ingresos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    netos=Coalesce(Sum('net_amount'), D('0')),
                )
            except:
                aggs = compras_qs.aggregate(ingresos=Coalesce(Sum('total_price'), D('0')))
                aggs.update({'comisiones': D('0'), 'netos': aggs['ingresos']})

            rows.append([
                ev.name, 
                ev.event_date.strftime('%Y-%m-%d') if ev.event_date else '', 
                ev.location, 
                ev.status, 
                str(ev.capacity), 
                str(total_tickets), 
                str(aggs['ingresos']), 
                str(aggs['comisiones']), 
                str(aggs['netos'])
            ])

            tot_tickets_global += total_tickets
            tot_bruto += aggs['ingresos']
            tot_comision += aggs['comisiones']
            tot_neto += aggs['netos']

            if aggs['netos'] > 0:
                bar_data_neto.append(float(aggs['netos']))
                bar_labels.append(ev.name[:15])

            pie_data_status[ev.status] = pie_data_status.get(ev.status, 0) + 1

        summary_header = ['Concepto', 'Total General']
        summary_rows = [
            ['Total de Eventos', str(eventos.count())],
            ['Total Tickets Vendidos', str(tot_tickets_global)],
            ['Ingresos Brutos Generados (BOB)', str(tot_bruto)],
            ['Comisiones Pagadas (BOB)', str(tot_comision)],
            ['Ingresos Netos Totales (BOB)', str(tot_neto)],
        ]

        charts = []
        if bar_data_neto:
            charts.append({'type': 'bar', 'data': bar_data_neto, 'labels': bar_labels, 'title': 'Ingresos Netos por Evento (BOB)'})
        if pie_data_status:
            charts.append({'type': 'pie', 'data': list(pie_data_status.values()), 'labels': list(pie_data_status.keys()), 'title': 'Estado de Eventos'})

        fmt = request.query_params.get('export_format', 'csv').lower()
        
        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response("promotor_dashboard_report.pdf", "Reporte Global del Promotor", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response("promotor_dashboard_report.csv", header, rows, summary_header, summary_rows)"""

replace_class('PromotorDashboardExportView', code_promotor_dashboard)

# ----------------- SuperAdminDashboardExportView -----------------
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

        header = ['Promotor ID', 'Tickets Vendidos', 'Ingresos Brutos', 'Comisiones Plataforma']
        rows = []
        
        tot_tickets = 0
        tot_bruto = D('0')
        tot_comisiones = D('0')

        bar_data = []
        bar_labels = []

        for p in promotores_data[:15]:
            rows.append([
                str(p['event__promoter_id']),
                str(p['tickets']),
                str(p['ingresos']),
                str(p['comisiones'])
            ])
            tot_tickets += p['tickets']
            tot_bruto += p['ingresos']
            tot_comisiones += p['comisiones']
            
            if p['comisiones'] > 0:
                bar_data.append(float(p['comisiones']))
                bar_labels.append(str(p['event__promoter_id'])[:8])

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

print("REEMPLAZO 2 OK")
