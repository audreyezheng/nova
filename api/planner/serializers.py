from rest_framework import serializers
from .models import Plan, Task


class TaskSuggestionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    due_at = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    confidence = serializers.FloatField(required=False)
    priority = serializers.ChoiceField(
        choices=["low", "medium", "high"], required=False, allow_null=True
    )
    estimated_minutes = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    status = serializers.ChoiceField(
        choices=["pending", "in_progress", "completed"], required=False, allow_null=True
    )


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "title", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "plan",
            "title",
            "status",
            "due_at",
            "notes",
            "priority",
            "estimated_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "plan": {"required": False},
        }

