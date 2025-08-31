# Generated manually for adding user field

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('planner', '0002_task_estimated_minutes_task_priority_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='plan',
            name='user',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='plans', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
    ]