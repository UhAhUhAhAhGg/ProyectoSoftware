import codecs

with codecs.open('service-events/events/views.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

injection = '''
        from django.db.models.functions import TruncMonth

        # 4. Ingresos por mes
        monthly_qs = compras_qs.annotate(
            month=TruncMonth('event__event_date')
        ).values('month').annotate(
            ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
            ingresos_netos=Coalesce(Sum('net_amount'), D('0')) if 'net_amount' in [f.name for f in Purchase._meta.get_fields()] else Coalesce(Sum('total_price'), D('0'))
        ).order_by('month')

        ingresos_mensuales = [
            {
                'month': m['month'].strftime('%b %Y') if m['month'] else 'Sin Fecha',
                'ingresos_brutos': m['ingresos_brutos'],
                'ingresos_netos': m['ingresos_netos'],
                'time': m['month'].timestamp() if m['month'] else 0
            }
            for m in monthly_qs
        ]
        
        # Sort by timestamp to be sure
        ingresos_mensuales.sort(key=lambda x: x['time'])
'''

return_injection = '''
            'ingresos_netos': aggs['ingresos_netos'],
            'ingresos_mensuales': ingresos_mensuales,
'''

if 'ingresos_mensuales' not in text:
    text = text.replace("tasa_ocupacion = (", injection + "\\n        tasa_ocupacion = (")
    text = text.replace("'ingresos_netos': aggs['ingresos_netos'],", return_injection)

with codecs.open('service-events/events/views.py', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
