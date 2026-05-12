from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, UserProfile
from datetime import date


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Crea automáticamente un UserProfile cuando se crea un usuario"""
    if created:
        # Solo crea si no existe
        if not hasattr(instance, 'profile'):
            UserProfile.objects.create(
                user=instance,
                first_name='',
                last_name='',
                phone='',
                date_of_birth=date.today(),  # Default date
                profile_photo_url=''
            )


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Guarda el UserProfile cuando se guarda el usuario"""
    if hasattr(instance, 'profile'):
        instance.profile.save()
