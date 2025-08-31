from typing import List, Dict, Any

import json
import os
from datetime import datetime, timedelta, time
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Plan, Task
from .serializers import PlanSerializer, TaskSerializer, TaskSuggestionSerializer


def suggest_tasks_from_message(message: str) -> List[str]:
    normalized = message.lower()
    tasks: List[str] = []

    keyword_to_tasks = {
        "wedding": [
            "RSVP to the invitation",
            "Send a gift",
            "Book flights",
            "Book hotel",
            "Plan outfit",
            "Arrange transportation to venue",
        ],
        "trip": [
            "Book flights",
            "Book accommodation",
            "Create itinerary",
            "Set travel budget",
            "Arrange travel insurance",
        ],
        "birthday": [
            "Plan guest list",
            "Send invitations",
            "Order cake",
            "Buy decorations",
            "Choose venue",
        ],
    }

    for keyword, related_tasks in keyword_to_tasks.items():
        if keyword in normalized:
            tasks.extend(related_tasks)

    if not tasks:
        tasks = [
            "Clarify the goal",
            "List key steps",
            "Set deadlines",
            "Identify required resources",
        ]

    # Make tasks unique while preserving order
    seen = set()
    unique_tasks = [t for t in tasks if not (t in seen or seen.add(t))]
    return unique_tasks


class GenerateTasksView(APIView):
    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"detail": "'message' is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tasks = suggest_tasks_from_message(message)
        return Response({"tasks": tasks})


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all().order_by("-created_at")
    serializer_class = PlanSerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by("-created_at")
    serializer_class = TaskSerializer


def _derive_default_plan_title(message: str) -> str:
    lower = message.lower()
    if "wedding" in lower:
        return "Wedding Plan"
    if "trip" in lower:
        return "Trip Plan"
    if "birthday" in lower:
        return "Birthday Plan"
    return "New Plan"


def _call_openai_for_suggestions(message: str) -> List[Dict[str, Any]]:
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # Fallback: map to rule-based tasks, wrap with fields
        return [
            {"title": t, "due_at": None, "notes": None, "priority": "medium", "estimated_minutes": None}
            for t in suggest_tasks_from_message(message)
        ]

    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return [
            {"title": t, "due_at": None, "notes": None, "priority": "medium", "estimated_minutes": None}
            for t in suggest_tasks_from_message(message)
        ]

    client = OpenAI(api_key=api_key)
    system_prompt = (
        "You are a planning assistant. Extract 5-10 actionable tasks from the user's message. "
        "Prefer concise titles. Infer due dates only if clearly implied (ISO 8601)."
    )
    user_prompt = (
        f"Message: {message}\n"
        "Return JSON with a 'tasks' array where each item has: title (string), due_at (ISO datetime or null), notes (string or null), tags (array), confidence (0-1)."
    )

    try:
        completion = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            response_format={"type": "json_object"},
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = completion.choices[0].message.content or "{}"
    except Exception:
        return [
            {"title": t, "due_at": None, "notes": None, "priority": "medium", "estimated_minutes": None}
            for t in suggest_tasks_from_message(message)
        ]
    try:
        data = json.loads(content)
        items = data.get("tasks", [])
        validated: List[Dict[str, Any]] = []
        for item in items:
            serializer = TaskSuggestionSerializer(data=item)
            if serializer.is_valid():
                validated.append(serializer.validated_data)
        if validated:
            return validated
    except Exception:
        pass
    return [{"title": t, "due_at": None, "notes": None} for t in suggest_tasks_from_message(message)]


class LLMGenerateTasksView(APIView):
    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response({"detail": "'message' is required"}, status=status.HTTP_400_BAD_REQUEST)

        suggestions = _call_openai_for_suggestions(message)
        plan_title = _derive_default_plan_title(message)
        return Response({"plan_title": plan_title, "tasks": suggestions})


class UpcomingTasksView(APIView):
    def get(self, request):
        # Tasks not done, ordered by due date with undated last
        queryset = (
            Task.objects.exclude(status=Task.STATUS_DONE)
            .order_by("due_at__isnull", "due_at", "-created_at")
        )
        limit = int(request.query_params.get("limit", 20))
        serializer = TaskSerializer(queryset[:limit], many=True)
        return Response(serializer.data)


class SchedulePreviewView(APIView):
    """Naive scheduler that proposes slots for tasks within the next 7 days.

    Request body: { tasks: [{ title, estimated_minutes?, priority?, due_at? }] }
    Response: {
        week: [ { date: 'YYYY-MM-DD', items: [{ title, start, end, priority, estimated_minutes }] } ],
        quick_wins: [{ title, estimated_minutes, priority }]
    }
    """

    def post(self, request):
        tasks: List[Dict[str, Any]] = request.data.get("tasks", [])
        # Normalize tasks
        normalized: List[Dict[str, Any]] = []
        for t in tasks:
            title = (t.get("title") or "").strip()
            if not title:
                continue
            estimated = t.get("estimated_minutes")
            try:
                estimated = int(estimated) if estimated is not None else None
            except Exception:
                estimated = None
            due_raw = t.get("due_at")
            due_dt = None
            if due_raw:
                try:
                    due_dt = datetime.fromisoformat(due_raw.replace("Z", "+00:00"))
                except Exception:
                    due_dt = None
            normalized.append(
                {
                    "title": title,
                    "estimated_minutes": estimated or 30,
                    "priority": t.get("priority") or "medium",
                    "due_at": due_dt,
                }
            )

        today = datetime.now().date()
        week_days = [today + timedelta(days=i) for i in range(7)]
        day_capacity_minutes = 120  # 2 hours/day for tasks
        day_load: Dict[str, int] = {d.isoformat(): 0 for d in week_days}
        schedule: Dict[str, List[Dict[str, Any]]] = {d.isoformat(): [] for d in week_days}
        quick_wins: List[Dict[str, Any]] = []

        # Heuristic: must-dos first (has due date within next 14 days), then others
        must_dos: List[Dict[str, Any]] = []
        others: List[Dict[str, Any]] = []
        for t in normalized:
            if t["due_at"] and (t["due_at"].date() - today).days <= 14:
                must_dos.append(t)
            else:
                others.append(t)

        def place_task(task: Dict[str, Any]) -> bool:
            for d in week_days:
                # respect due date if present
                if task["due_at"] and d > task["due_at"].date():
                    break
                key = d.isoformat()
                if day_load[key] + task["estimated_minutes"] <= day_capacity_minutes:
                    # place starting at 10:00 + load offset
                    start_minutes = 10 * 60 + day_load[key]
                    start_hour = start_minutes // 60
                    start_min = start_minutes % 60
                    start_dt = datetime.combine(d, time(hour=start_hour, minute=start_min))
                    end_dt = start_dt + timedelta(minutes=task["estimated_minutes"])
                    schedule[key].append(
                        {
                            "title": task["title"],
                            "start": start_dt.isoformat(),
                            "end": end_dt.isoformat(),
                            "priority": task["priority"],
                            "estimated_minutes": task["estimated_minutes"],
                        }
                    )
                    day_load[key] += task["estimated_minutes"]
                    return True
            return False

        for t in must_dos + others:
            placed = place_task(t)
            if not placed:
                quick_wins.append(
                    {
                        "title": t["title"],
                        "estimated_minutes": t["estimated_minutes"],
                        "priority": t["priority"],
                    }
                )

        week_payload = [
            {"date": d.isoformat(), "items": schedule[d.isoformat()]} for d in week_days
        ]
        return Response({"week": week_payload, "quick_wins": quick_wins})


