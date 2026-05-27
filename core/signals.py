# signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from .models import Student


# =========================================================
# SYNC STUDENT (ON USER UPDATE)
# =========================================================
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def sync_student(sender, instance, created, **kwargs):

    # Skip initial user creation
    if created:
        return

    try:
        # Get existing student profile
        student = Student.objects.get(user=instance)

        # Keep profile activation in step with account activation.
        student.email = instance.email
        student.is_active = instance.is_active

        student.save(update_fields=['email', 'is_active'])

    except Student.DoesNotExist:
        return
