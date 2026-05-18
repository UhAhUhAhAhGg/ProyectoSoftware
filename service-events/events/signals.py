from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Event, UserPreference, Notification

@receiver(post_save, sender=Event)
def notify_event_match(sender, instance, created, **kwargs):
    """
    Cuando se crea un nuevo evento, busca usuarios que tengan 
    activadas las notificaciones para esa categoría.
    """
    # Solo actuamos si el evento es NUEVO
    if created:
        categoria_del_evento = instance.category
        
        # 1. Buscamos todas las preferencias que coincidan y tengan notificaciones activas
        preferencias_match = UserPreference.objects.filter(
            category=categoria_del_evento,
            notifications_enabled=True
        )

        # 2. Creamos una notificación para cada usuario que hizo match
        notificaciones_a_crear = []
        for pref in preferencias_match:
            notificaciones_a_crear.append(
                Notification(
                    user_id=pref.user_id, # El ID del usuario que quiere el aviso
                    event=instance,
                    tipo='match', # Según tu NotificationSerializer
                    titulo="¡Nuevo Match de Evento!",
                    mensaje=(
                        f"Se ha publicado un nuevo evento de {categoria_del_evento.name}: "
                        f"'{instance.name}'. ¡Asegura tu lugar!"
                    )
                )
            )
        
        # 3. Inserción masiva para ser eficientes si hay muchos usuarios
        if notificaciones_a_crear:
            Notification.objects.bulk_create(notificaciones_a_crear)