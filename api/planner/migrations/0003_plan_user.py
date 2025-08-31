# Generated manually for adding user field

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_user_and_assign_plans(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Plan = apps.get_model('planner', 'Plan')
    
    # Create a default user for existing plans
    default_user, created = User.objects.get_or_create(
        username='system',
        defaults={
            'email': 'system@nova.app',
            'first_name': 'System',
            'last_name': 'User',
            'is_active': False,  # Make it inactive
        }
    )
    
    # Assign all existing plans to this user
    Plan.objects.update(user=default_user)


def reverse_migration(apps, schema_editor):
    # Remove the system user
    User = apps.get_model('auth', 'User')
    User.objects.filter(username='system').delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('planner', '0002_task_estimated_minutes_task_priority_and_more'),
    ]

    operations = [
        # First add the field as nullable
        migrations.AddField(
            model_name='plan',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='plans', to=settings.AUTH_USER_MODEL),
        ),
        # Then populate it with data
        migrations.RunPython(
            create_default_user_and_assign_plans,
            reverse_migration
        ),
        # Finally make it non-nullable
        migrations.AlterField(
            model_name='plan',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plans', to=settings.AUTH_USER_MODEL),
        ),
    ]