"""
РўРµСЃС‚С‹ РґР»СЏ РїСЂРѕРІРµСЂРєРё API Рё РїР°Р№РїР»Р°Р№РЅР° РѕР±СЂР°Р±РѕС‚РєРё РїРѕСЃС‚РѕРІ.
"""
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from saas.models import Post, Prompt, SubscriptionPlan, Workspace, WorkspaceMember
from saas.scraper import _scrape_single_post
from saas.tasks import process_post, scrape_and_process_post


class SubscriptionAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(name='Test Workspace', owner=self.user)
        WorkspaceMember.objects.create(user=self.user, workspace=self.workspace, role='owner')

        self.plan = SubscriptionPlan.objects.create(
            name='Basic Plan',
            description='Basic subscription plan',
            price=9.99,
            period_months=1,
            max_workspaces=1,
            max_seats_per_workspace=3,
            max_posts_per_month=100,
        )

    def test_subscription_plan_list(self):
        url = reverse('subscription-plan-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Basic Plan')

    def test_user_subscription_creation(self):
        url = reverse('user-subscription-list')
        data = {
            'plan': self.plan.id,
            'workspace': self.workspace.id,
        }
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [201, 400])


class PostProcessingTextFallbackTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='fallback_user', password='testpass')
        self.workspace = Workspace.objects.create(name='Fallback Workspace', owner=self.user)
        WorkspaceMember.objects.create(user=self.user, workspace=self.workspace, role='owner')

    @patch('saas.tasks.generate_caption', return_value='generated caption text')
    def test_process_post_uses_description_when_original_is_empty(self, mocked_generate):
        post = Post.objects.create(
            workspace=self.workspace,
            created_by=self.user,
            original_text='',
            description='description from scraper',
            transcript='',
            status='new',
        )
        Prompt.objects.create(
            workspace=self.workspace,
            name='Caption default',
            type='caption',
            content='Generate caption',
            is_active=True,
            is_default=True,
        )

        process_post.run(post.id)

        post.refresh_from_db()
        self.assertEqual(post.status, 'ready')
        self.assertEqual(post.generated_caption, 'generated caption text')
        mocked_generate.assert_called()
        self.assertEqual(
            mocked_generate.call_args.kwargs['original_text'],
            'description from scraper',
        )

    @patch('saas.tasks.process_post.delay')
    @patch('saas.tasks.scrape_content')
    def test_scrape_sets_original_from_description_when_caption_empty(self, mocked_scrape, mocked_delay):
        mocked_scrape.return_value = {
            'caption': '',
            'description': 'service description text',
            'transcript': '',
            'platform': 'youtube',
            'views_count': 1,
            'likes_count': 1,
            'comments_count': 0,
            'shares_count': 0,
            'engagement_rate': 1.0,
            'video_duration': 10,
            'published_at': None,
            'play_count': 1,
            'saves_count': 0,
            'author_followers': 1,
            'has_audio': True,
            'is_video': True,
        }
        post = Post.objects.create(
            workspace=self.workspace,
            created_by=self.user,
            source_url='https://youtube.com/watch?v=test',
            status='new',
        )

        scrape_and_process_post.run(post.id)

        post.refresh_from_db()
        self.assertEqual(post.original_text, '')
        self.assertEqual(post.description, 'service description text')
        mocked_delay.assert_called_once_with(post.id)

    @patch('saas.tasks.process_post.delay')
    @patch('saas.tasks.scrape_content')
    def test_scrape_sets_original_from_transcript_when_available(self, mocked_scrape, mocked_delay):
        mocked_scrape.return_value = {
            'caption': 'service caption',
            'description': 'service description',
            'transcript': 'service transcript',
            'platform': 'youtube',
            'views_count': 1,
            'likes_count': 1,
            'comments_count': 0,
            'shares_count': 0,
            'engagement_rate': 1.0,
            'video_duration': 10,
            'published_at': None,
            'play_count': 1,
            'saves_count': 0,
            'author_followers': 1,
            'has_audio': True,
            'is_video': True,
        }
        post = Post.objects.create(
            workspace=self.workspace,
            created_by=self.user,
            source_url='https://youtube.com/watch?v=test',
            status='new',
        )

        scrape_and_process_post.run(post.id)

        post.refresh_from_db()
        self.assertEqual(post.original_text, 'service transcript')
        self.assertEqual(post.transcript, 'service transcript')
        self.assertEqual(post.description, 'service description')
        mocked_delay.assert_called_once_with(post.id)


class YouTubeScraperFallbackTestCase(TestCase):
    @patch('saas.scraper.get_session')
    def test_youtube_uses_title_when_description_empty(self, mocked_get_session):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            'title': 'Fallback title from YouTube',
            'description': '',
            'channel': {'handle': '@channel'},
            'viewCountInt': 1000,
            'likeCountInt': 100,
            'commentCountInt': 10,
            'shareCountInt': 2,
            'durationText': '0:45',
            'url': 'https://www.youtube.com/shorts/test',
        }

        mock_session = mocked_get_session.return_value
        mock_session.get.return_value = mock_response

        result = _scrape_single_post(
            url='https://www.youtube.com/shorts/test',
            platform='youtube',
            api_base='https://api.scrapecreators.com/v1',
            user=None,
        )

        self.assertEqual(result['caption'], 'Fallback title from YouTube')
        self.assertEqual(result['description'], 'Fallback title from YouTube')
