from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from .models import Plan, Task


class GenerateTasksTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tester", email="tester@example.com", password="password123"
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_wedding_message_generates_expected_tasks(self):
        url = reverse("generate-tasks")
        response = self.client.post(url, {"message": "I have a wedding coming up"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tasks = response.json().get("tasks", [])
        self.assertIn("RSVP to the invitation", tasks)
        self.assertIn("Send a gift", tasks)

    def test_requires_message(self):
        url = reverse("generate-tasks")
        response = self.client.post(url, {"message": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_plan_and_task_crud(self):
        # Create a plan
        plan_resp = self.client.post(reverse("plan-list"), {"title": "Wedding Plan"}, format="json")
        self.assertEqual(plan_resp.status_code, status.HTTP_201_CREATED)
        plan_id = plan_resp.json()["id"]

        # Create a task
        task_resp = self.client.post(
            reverse("task-list"),
            {"plan": plan_id, "title": "RSVP to the invitation"},
            format="json",
        )
        self.assertEqual(task_resp.status_code, status.HTTP_201_CREATED)
        task_id = task_resp.json()["id"]

        # Update task
        patch_resp = self.client.patch(
            reverse("task-detail", args=[task_id]), {"status": "completed"}, format="json"
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.json()["status"], "completed")

        # List plan detail
        detail_resp = self.client.get(reverse("plan-detail", args=[plan_id]))
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

    def test_llm_endpoint_without_key_falls_back(self):
        url = reverse("generate-tasks-llm")
        response = self.client.post(url, {"message": "I have a wedding coming up"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("plan_title", data)
        self.assertIn("tasks", data)
        self.assertTrue(len(data["tasks"]) > 0)

    def test_task_creation_without_plan_creates_default(self):
        response = self.client.post(
            reverse("task-list"),
            {"title": "Follow up"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.json()["id"]
        task = Task.objects.get(id=task_id)
        self.assertEqual(task.plan.title, "My Plan")
        self.assertEqual(task.plan.user, self.user)


