"""
Script para resetear las compras de un usuario específico.
Ejecutar desde el contenedor service-events:
  docker exec service-events python /app/reset_purchases.py gustavo.quisbert.c@ucb.edu.bo
"""
import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from events.models import Purchase

def reset_purchases(email=None):
    if email:
        # Buscar por email en purchases (user_id es UUID, pero podemos filtrar)
        # Primero listar todos los user_ids con compras activas
        qs = Purchase.objects.filter(status__in=['active', 'pending'])
        print(f"Total compras activas/pendientes: {qs.count()}")
        for p in qs:
            print(f"  {p.id} | user_id={p.user_id} | {p.event.name} | {p.status} | {p.total_price}")
        
        # Cancelar TODAS las compras activas/pendientes (resetea para poder volver a comprar)
        updated = qs.update(status='cancelled')
        print(f"\nCompras canceladas: {updated}")
        print("Ahora el usuario puede volver a comprar entradas para esos eventos.")
    else:
        # Solo listar
        qs = Purchase.objects.all()
        print(f"Total compras: {qs.count()}")
        for p in qs:
            print(f"  {p.id} | user_id={p.user_id} | {p.event.name} | {p.status}")

if __name__ == '__main__':
    email = sys.argv[1] if len(sys.argv) > 1 else None
    reset_purchases(email)
