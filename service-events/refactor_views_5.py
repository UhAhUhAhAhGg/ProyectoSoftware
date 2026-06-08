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

# ----------------- ExportEventBuyersView -----------------
code_promotor_buyers = """class ExportEventBuyersView(APIView):
    \"\"\"
    US36 (US-33): Exportar lista de compradores de un evento.
    GET /api/v1/promotor/events/<event_id>/buyers/export/?export_format=csv|pdf
    \"\"\"
    permission_classes = [IsAuthenticated, IsPromotor]

    def get(self, request, event_id):
        evento = get_object_or_404(Event, id=event_id)
        if str(evento.promoter_id) != str(request.user.id):
            return Response({'error': 'No tienes permisos sobre este evento.'}, status=403)

        status_filtro = request.query_params.get('status', 'active,used')
        status_list = [s.strip() for s in status_filtro.split(',') if s.strip()]
        compras_qs = Purchase.objects.filter(event=evento, status__in=status_list)

        fmt = request.query_params.get('export_format', 'csv').lower()
        header, rows = _build_buyers_rows(compras_qs)
        
        # Summary
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        from decimal import Decimal as D
        
        tot_active = compras_qs.filter(status='active').count()
        tot_used = compras_qs.filter(status='used').count()
        tot_cancelled = Purchase.objects.filter(event=evento, status='cancelled').count()
        tot_qty = compras_qs.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
        
        summary_header = ['Estado de Ticket', 'Cantidad de Compras', 'Detalle Opcional']
        summary_rows = [
            ['Activos (Por Usar)', str(tot_active), 'Tickets emitidos válidos'],
            ['Usados (Escaneados)', str(tot_used), 'Tickets ya ingresados al evento'],
            ['Cancelados/Reembolsados', str(tot_cancelled), 'Tickets anulados'],
            ['Total Tickets (Cantidad)', str(tot_qty), 'Sumatoria de cantidad en compras activas/usadas']
        ]

        charts = []
        if tot_active > 0 or tot_used > 0:
            charts.append({
                'type': 'pie', 
                'data': [float(tot_active), float(tot_used)], 
                'labels': ['Activos', 'Usados'], 
                'title': 'Estado de Entradas Vendidas'
            })

        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Evento: {evento.name} | Fecha: {evento.event_date} | Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response(f"compradores_{safe_name}.pdf", "Lista de Compradores", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response(f"compradores_{safe_name}.csv", header, rows, summary_header, summary_rows)"""

replace_class('ExportEventBuyersView', code_promotor_buyers)

# ----------------- AdminExportEventBuyersView -----------------
code_admin_buyers = """class AdminExportEventBuyersView(APIView):
    \"\"\"
    GET /api/v1/admin/events/<event_id>/buyers/export/?export_format=csv|pdf
    \"\"\"
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request, event_id):
        evento = get_object_or_404(Event, id=event_id)
        status_filtro = request.query_params.get('status', 'active,used')
        status_list = [s.strip() for s in status_filtro.split(',') if s.strip()]
        compras_qs = Purchase.objects.filter(event=evento, status__in=status_list)

        fmt = request.query_params.get('export_format', 'csv').lower()
        header, rows = _build_buyers_rows(compras_qs)
        
        # Summary
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        from decimal import Decimal as D
        
        tot_active = compras_qs.filter(status='active').count()
        tot_used = compras_qs.filter(status='used').count()
        tot_cancelled = Purchase.objects.filter(event=evento, status='cancelled').count()
        tot_qty = compras_qs.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
        
        summary_header = ['Estado de Ticket', 'Cantidad de Compras', 'Detalle Opcional']
        summary_rows = [
            ['Activos (Por Usar)', str(tot_active), 'Tickets emitidos válidos'],
            ['Usados (Escaneados)', str(tot_used), 'Tickets ya ingresados al evento'],
            ['Cancelados/Reembolsados', str(tot_cancelled), 'Tickets anulados'],
            ['Total Tickets (Cantidad)', str(tot_qty), 'Sumatoria de cantidad en compras activas/usadas']
        ]

        charts = []
        if tot_active > 0 or tot_used > 0:
            charts.append({
                'type': 'pie', 
                'data': [float(tot_active), float(tot_used)], 
                'labels': ['Activos', 'Usados'], 
                'title': 'Estado de Entradas Vendidas'
            })

        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Evento: {evento.name} | Promotor: {evento.promoter_id} | Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response(f"admin_compradores_{safe_name}.pdf", "Lista de Compradores (Admin)", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response(f"admin_compradores_{safe_name}.csv", header, rows, summary_header, summary_rows)"""

replace_class('AdminExportEventBuyersView', code_admin_buyers)

with open('events/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("REEMPLAZO 3 OK")
