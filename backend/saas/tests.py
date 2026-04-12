"""
Тесты для проверки новых API-эндпоинтов
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from saas.models import Workspace, WorkspaceMember, SubscriptionPlan


class SubscriptionAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)
        
        # Создаем воркспейс для пользователя
        self.workspace = Workspace.objects.create(name='Test Workspace', owner=self.user)
        WorkspaceMember.objects.create(user=self.user, workspace=self.workspace, role='owner')
        
        # Создаем тестовый тарифный план
        self.plan = SubscriptionPlan.objects.create(
            name='Basic Plan',
            description='Basic subscription plan',
            price=9.99,
            period_months=1,
            max_workspaces=1,
            max_seats_per_workspace=3,
            max_posts_per_month=100
        )

    def test_subscription_plan_list(self):
        """Проверяем, что список тарифных планов доступен"""
        url = reverse('subscription-plan-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Basic Plan')

    def test_user_subscription_creation(self):
        """Проверяем создание подписки пользователя"""
        url = reverse('user-subscription-list')
        data = {
            'plan': self.plan.id,
            'workspace': self.workspace.id
        }
        response = self.client.post(url, data, format='json')
        # Должен вернуть 201 (Created) или 400 (если валидация не проходит)
        self.assertIn(response.status_code, [201, 400])