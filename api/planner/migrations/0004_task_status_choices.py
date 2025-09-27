from django.db import migrations, models


def forwards(apps, schema_editor):
    Task = apps.get_model("planner", "Task")
    Task.objects.filter(status="todo").update(status="pending")
    Task.objects.filter(status="done").update(status="completed")


def backwards(apps, schema_editor):
    Task = apps.get_model("planner", "Task")
    Task.objects.filter(status="pending").update(status="todo")
    Task.objects.filter(status="completed").update(status="done")


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0003_plan_user"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("in_progress", "In Progress"),
                    ("completed", "Completed"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
