from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GenerateTasksView,
    LLMGenerateTasksView,
    PlanViewSet,
    TaskViewSet,
    UpcomingTasksView,
    SchedulePreviewView,
)


router = DefaultRouter()
router.register(r"plans", PlanViewSet, basename="plan")
router.register(r"tasks", TaskViewSet, basename="task")


urlpatterns = [
    path("", include(router.urls)),
    path("generate/", GenerateTasksView.as_view(), name="generate-tasks"),
    path("generate/llm/", LLMGenerateTasksView.as_view(), name="generate-tasks-llm"),
    path("tasks/upcoming/", UpcomingTasksView.as_view(), name="upcoming-tasks"),
    path("schedule/preview/", SchedulePreviewView.as_view(), name="schedule-preview"),
]


