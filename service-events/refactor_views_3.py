import sys

with open('events/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_class(class_name, new_code):
    global content
    start_str = f"class {class_name}(APIView):"
    try:
        start_idx = content.index(start_str)
        # Find the next class to know where this one ends
        next_class_idx = content.find("class ", start_idx + 10)
        
        # If this is the very last class, handle it
        if next_class_idx == -1:
            # Maybe there are some comments at the end
            next_class_idx = len(content)
            
        old_code = content[start_idx:next_class_idx]
        
        # Replace
        content = content[:start_idx] + new_code + "\n\n" + content[next_class_idx:]
    except ValueError:
        print(f"Error: {class_name} no encontrado")
        sys.exit(1)

# ----------------- ExportEventFinancialView -----------------
code_promotor_financial = """class ExportEventFinancialView(APIView):
    \"\"\"
    US36 (US-33): Exportar reporte financiero de un evento.
    GET /api/v1/promotor/events/<event_id>/financial/export/?export_format=csv|pdf
    \"\"\"
    permission_classes = [IsAuthenticated, IsPromotor]
    PAID_STATUSES = ['active', 'used']

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        evento = Event.objects.filter(id=event_id).first()
        if not evento:
            return Response({'error': f'Evento {event_id} no encontrado.'}, status=404)
        if str(evento.promoter_id) != str(request.user.id):
            return Response({'error': 'No tienes permisos.'}, status=403)

        compras_qs = Purchase.objects.filter(event=evento, status__in=self.PAID_STATUSES)

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

        header = ['Tipo Ticket', 'Zona', 'VIP', 'Precio Unit.', 'Capacidad', 'Vendidos', 'Ocupacion %', 'Ingresos Brutos', 'Comisiones', 'Ingresos Netos']
        rows = []
        pie_data, pie_labels, bar_data, bar_labels = [], [], [], []
        
        for tt in TicketType.objects.filter(event=evento):
            qs_tt = compras_qs.filter(ticket_type=tt)
            tt_tix = qs_tt.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            try:
                tt_fin = qs_tt.aggregate(ing=Coalesce(Sum('total_price'), D('0')), com=Coalesce(Sum('commission_amount'), D('0')), net=Coalesce(Sum('net_amount'), D('0')))
            except:
                tt_fin = qs_tt.aggregate(ing=Coalesce(Sum('total_price'), D('0')))
                tt_fin.update({'com': D('0'), 'net': tt_fin['ing']})

            oc = round(tt_tix / tt.max_capacity * 100, 1) if tt.max_capacity else 0.0
            rows.append([
                tt.name, tt.zone_type, 'Si' if tt.is_vip else 'No',
                str(tt.price), str(tt.max_capacity), str(tt_tix), f"{oc}%",
                str(tt_fin['ing']), str(tt_fin['com']), str(tt_fin['net']),
            ])
            
            if tt_tix > 0:
                pie_data.append(tt_tix)
                pie_labels.append(tt.name)
            if tt_fin['net'] > 0:
                bar_data.append(float(tt_fin['net']))
                bar_labels.append(tt.name)

        summary_header = ['Concepto', 'Monto']
        summary_rows = [
            ['Capacidad Total Evento', str(evento.capacity)],
            ['Total Tickets Vendidos', str(total_tickets)],
            ['Ocupacion Global (%)', f"{round((total_tickets/evento.capacity*100),1) if evento.capacity else 0}%"],
            ['Total Ingresos Brutos (BOB)', str(aggs['ingresos'])],
            ['Comisiones Generadas (BOB)', str(aggs['comisiones'])],
            ['Total Ingresos Netos (BOB)', str(aggs['netos'])],
        ]

        charts = []
        if pie_data: charts.append({'type': 'pie', 'data': pie_data, 'labels': pie_labels, 'title': 'Tickets Vendidos por Zona'})
        if bar_data: charts.append({'type': 'bar', 'data': bar_data, 'labels': bar_labels, 'title': 'Ingresos Netos por Zona (BOB)'})

        fmt = request.query_params.get('export_format', 'csv').lower()
        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Evento: {evento.name} | Fecha: {evento.event_date} | Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response(f"financiero_{safe_name}.pdf", "Reporte Financiero por Evento", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response(f"financiero_{safe_name}.csv", header, rows, summary_header, summary_rows)"""

replace_class('ExportEventFinancialView', code_promotor_financial)

# ----------------- AdminExportEventFinancialView -----------------
code_admin_financial = """class AdminExportEventFinancialView(APIView):
    \"\"\"
    Exportar reporte financiero de un evento para Administradores.
    GET /api/v1/admin/events/<event_id>/financial/export/?export_format=csv|pdf
    \"\"\"
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]
    PAID_STATUSES = ['active', 'used']

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        evento = get_object_or_404(Event, id=event_id)
        compras_qs = Purchase.objects.filter(event=evento, status__in=self.PAID_STATUSES)

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

        header = ['Tipo Ticket', 'Zona', 'VIP', 'Precio Unit.', 'Capacidad', 'Vendidos', 'Ocupacion %', 'Ingresos Brutos', 'Comisiones', 'Ingresos Netos']
        rows = []
        pie_data, pie_labels, bar_data, bar_labels = [], [], [], []
        
        for tt in TicketType.objects.filter(event=evento):
            qs_tt = compras_qs.filter(ticket_type=tt)
            tt_tix = qs_tt.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            try:
                tt_fin = qs_tt.aggregate(ing=Coalesce(Sum('total_price'), D('0')), com=Coalesce(Sum('commission_amount'), D('0')), net=Coalesce(Sum('net_amount'), D('0')))
            except:
                tt_fin = qs_tt.aggregate(ing=Coalesce(Sum('total_price'), D('0')))
                tt_fin.update({'com': D('0'), 'net': tt_fin['ing']})

            oc = round(tt_tix / tt.max_capacity * 100, 1) if tt.max_capacity else 0.0
            rows.append([
                tt.name, tt.zone_type, 'Si' if tt.is_vip else 'No',
                str(tt.price), str(tt.max_capacity), str(tt_tix), f"{oc}%",
                str(tt_fin['ing']), str(tt_fin['com']), str(tt_fin['net']),
            ])
            
            if tt_tix > 0:
                pie_data.append(tt_tix)
                pie_labels.append(tt.name)
            if tt_fin['net'] > 0:
                bar_data.append(float(tt_fin['net']))
                bar_labels.append(tt.name)

        summary_header = ['Concepto', 'Monto']
        summary_rows = [
            ['Capacidad Total Evento', str(evento.capacity)],
            ['Total Tickets Vendidos', str(total_tickets)],
            ['Ocupacion Global (%)', f"{round((total_tickets/evento.capacity*100),1) if evento.capacity else 0}%"],
            ['Total Ingresos Brutos (BOB)', str(aggs['ingresos'])],
            ['Comisiones de Plataforma (BOB)', str(aggs['comisiones'])],
            ['Total Ingresos Netos (Promotor) (BOB)', str(aggs['netos'])],
        ]

        charts = []
        if pie_data: charts.append({'type': 'pie', 'data': pie_data, 'labels': pie_labels, 'title': 'Tickets Vendidos por Zona'})
        if bar_data: charts.append({'type': 'bar', 'data': bar_data, 'labels': bar_labels, 'title': 'Ingresos Netos por Zona (BOB)'})

        fmt = request.query_params.get('export_format', 'csv').lower()
        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = f"Evento: {evento.name} | Promotor: {evento.promoter_id} | Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            return _pdf_response(f"admin_financiero_{safe_name}.pdf", "Reporte Financiero (Admin)", subtitle, header, rows, summary_header, summary_rows, charts)

        return _csv_response(f"admin_financiero_{safe_name}.csv", header, rows, summary_header, summary_rows)"""

replace_class('AdminExportEventFinancialView', code_admin_financial)


with open('events/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("REEMPLAZO 1 OK")
