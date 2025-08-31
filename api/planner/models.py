from django.db import models


class Plan(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.title


class Task(models.Model):
    STATUS_TODO = "todo"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_DONE = "done"
    STATUS_CHOICES = [
        (STATUS_TODO, "To Do"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_DONE, "Done"),
    ]

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
    ]

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TODO)
    due_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    estimated_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.title

