from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import models
from django.db.models import Count, Prefetch
from django.utils.functional import cached_property
from django.contrib.auth import get_user_model

from .models import (
    Workspace,
    WorkspaceMember,
    Post,
    Prompt,
    SubscriptionPlan,
    UserSubscription,
    SubscriptionFeature,
    CompetitorAccount,
    SystemSettings,
    WorkspaceActivity,
    InviteToken,
    PostNote,
    ApiCallLog,
)
from .serializers import (
    WorkspaceSerializer,
    PostSerializer,
    PromptSerializer,
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    SubscriptionFeatureSerializer,
    CompetitorAccountSerializer,
    SystemSettingsSerializer,
    WorkspaceActivitySerializer,
    InviteTokenSerializer,
    RegisterSerializer,
    IssueAccountSerializer,
    PostNoteSerializer,
    ApiCallLogSerializer,
)
from .tasks import process_post, scrape_and_process_post


def get_member_role(user, workspace_id):
    """Получить роль пользователя в workspace"""
    try:
        member = WorkspaceMember.objects.get(workspace_id=workspace_id, user=user)
        return member.role
    except WorkspaceMember.DoesNotExist:
        return None


class WorkspacePermission(permissions.BasePermission):
    """
    owner/admin — полный доступ
    editor — CRUD кроме удаления workspace
    viewer — только чтение
    """
    def has_object_permission(self, request, view, obj):
        role = get_member_role(request.user, obj.id)
        if request.method in permissions.SAFE_METHODS:
            return role is not None  # все члены могут читать
        if role in ('owner', 'admin'):
            return True
        if role == 'editor':
            return request.method in ('POST', 'PUT', 'PATCH')  # нет DELETE
        return False


class PostPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        role = get_member_role(request.user, obj.workspace_id)
        if request.method in permissions.SAFE_METHODS:
            return role is not None
        if role in ('owner', 'admin', 'editor'):
            return request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
        return False


class PromptPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        role = get_member_role(request.user, obj.workspace_id)
        if request.method in permissions.SAFE_METHODS:
            return role is not None
        if role in ('owner', 'admin', 'editor'):
            return request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
        return False


class ActivityPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        role = get_member_role(request.user, obj.workspace_id)
        if request.method in permissions.SAFE_METHODS:
            return role is not None
        if role in ('owner', 'admin', 'editor'):
            return True
        return False


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated, WorkspacePermission]

    def get_queryset(self):  # type: ignore[override]
        # Оптимизация: аннотация posts_count + prefetch активностей
        qs = Workspace.objects.filter(
            members__user=self.request.user
        ).annotate(
            posts_count=Count('posts', distinct=True)
        ).prefetch_related(
            Prefetch(
                'activities',
                queryset=WorkspaceActivity.objects.order_by('-created_at')[:5],
                to_attr='_prefetched_activities'
            )
        ).distinct()

        # Фильтр: только клиенты
        is_client = self.request.GET.get('is_client')
        if is_client is not None:
            qs = qs.filter(is_client=is_client.lower() == 'true')

        # Поиск по названию, контакту или тегам
        search = self.request.GET.get('search')
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(client_name__icontains=search) |
                models.Q(client_contact__icontains=search) |
                models.Q(tags__icontains=search)
            )

        # Сортировка
        sort_field = self.request.GET.get('sort', 'updated_at')
        ordering = self.request.GET.get('ordering', 'desc')
        sort_map = {
            'name': 'name',
            'updated_at': 'updated_at',
            'created_at': 'created_at',
            'posts': 'posts_count',
        }
        db_field = sort_map.get(sort_field, 'updated_at')
        order_prefix = '-' if ordering == 'desc' else ''
        if sort_field == 'posts':
            qs = qs.annotate(posts_count=models.Count('posts')).order_by(f'{order_prefix}posts_count', '-id')
        else:
            qs = qs.order_by(f'{order_prefix}{db_field}', '-id')

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        settings = SystemSettings.get_settings()

        # Проверка лимита воркспейсов
        user_workspace_count = Workspace.objects.filter(owner=user).count()
        if user_workspace_count >= settings.max_workspaces_per_user:
            raise serializers.ValidationError({
                'name': f'Достигнут лимит воркспейсов ({settings.max_workspaces_per_user}). '
                        f'Удалите старые или обратитесь к администратору.'
            })

        workspace = serializer.save(owner=user)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role='owner',
        )


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated, PostPermission]

    # тоже ignore, чтобы не было reportIncompatibleMethodOverride
    def get_queryset(self):  # type: ignore[override]
        user = self.request.user

        qs = Post.objects.filter(
            workspace__members__user=user
        ).select_related('workspace').distinct()

        workspace_id = self.request.GET.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        # Фильтр по минимальному engagement rate
        min_er = self.request.GET.get('min_er')
        if min_er:
            try:
                qs = qs.filter(engagement_rate__gte=float(min_er))
            except (ValueError, TypeError):
                pass

        # Сортировка
        sort_field = self.request.GET.get('sort')
        ordering = self.request.GET.get('ordering', 'desc')
        sort_map = {
            'engagement_rate': 'engagement_rate',
            'views': 'views_count',
            'likes': 'likes_count',
            'comments': 'comments_count',
            'created_at': 'created_at',
        }
        db_field = sort_map.get(sort_field, 'created_at')
        order_prefix = '-' if ordering == 'desc' else ''
        qs = qs.order_by(f'{order_prefix}{db_field}', '-id')

        return qs

    def perform_create(self, serializer):
        post = serializer.save(created_by=self.request.user)
        
        # Если есть source_url - запускаем парсинг + обработку
        if post.source_url:
            scrape_and_process_post.delay(post.id)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Запустить фоновую обработку поста."""
        post = self.get_object()

        if post.status == 'in_progress':
            return Response(
                {'detail': 'Пост уже обрабатывается.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        post.status = 'in_progress'
        post.save(update_fields=['status', 'updated_at'])

        # Если есть source_url - всегда парсим (чтобы получить актуальные метрики)
        if post.source_url:
            scrape_and_process_post.delay(post.id)
        else:
            # Если source_url нет - просто генерируем контент из existing text
            process_post.delay(post.id)

        return Response(
            {'detail': 'Обработка поста запущена.'},
            status=status.HTTP_202_ACCEPTED,
        )


class PromptViewSet(viewsets.ModelViewSet):
    serializer_class = PromptSerializer
    permission_classes = [permissions.IsAuthenticated, PromptPermission]

    def get_queryset(self):  # type: ignore[override]
        user = self.request.user

        qs = Prompt.objects.filter(
            workspace__members__user=user
        ).distinct()

        workspace_id = self.request.GET.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        return qs

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """
        Установить этот промпт как дефолтный для его типа.
        POST /api/prompts/{id}/set_default/
        """
        prompt = self.get_object()

        # Сбрасываем остальные дефолтные промпты этого типа в workspace
        Prompt.objects.filter(
            workspace=prompt.workspace,
            type=prompt.type,
            is_default=True
        ).exclude(pk=prompt.pk).update(is_default=False)

        prompt.is_default = True
        prompt.save(update_fields=['is_default', 'updated_at'])

        return Response({
            'detail': f'Промпт "{prompt.name}" установлен как дефолтный для типа {prompt.type}',
            'is_default': True,
        })


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для тарифных планов (только чтение)
    """
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True)


class UserSubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для подписок пользователей
    """
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UserSubscription.objects.filter(
            user=user
        ).select_related('plan', 'workspace')

    def perform_create(self, serializer):
        # Проверяем, что пользователь является членом воркспейса
        workspace = serializer.validated_data['workspace']
        user = self.request.user

        if not WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user
        ).exists():
            raise permissions.PermissionDenied("Вы не являетесь участником этого воркспейса.")

        serializer.save(user=user)


class SubscriptionFeatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для возможностей тарифных планов (только чтение)
    """
    serializer_class = SubscriptionFeatureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        plan_id = self.request.GET.get('plan_id')
        if plan_id:
            return SubscriptionFeature.objects.filter(plan_id=plan_id)


class CompetitorAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления аккаунтами конкурентов
    """
    serializer_class = CompetitorAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        """Возвращает только аккаунты из workspace, где пользователь является участником"""
        user = self.request.user
        return CompetitorAccount.objects.filter(
            workspace__members__user=user
        ).select_related('workspace').distinct()

    def perform_create(self, serializer):
        """При создании проверяем доступ к workspace"""
        # Валидация происходит в serializer.validate_workspace()
        serializer.save()

    @action(detail=True, methods=['post'])
    def scrape(self, request, pk=None):
        """
        Запустить парсинг постов для конкретного конкурента.
        POST /api/competitors/{id}/scrape/
        """
        from .tasks import scrape_single_competitor
        from rest_framework.throttling import ScopedRateThrottle

        competitor = self.get_object()

        if not competitor.is_active:
            return Response(
                {'error': 'Competitor account is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Rate limit: 50 scrapes per hour per user
        throttle = ScopedRateThrottle()
        throttle.rate = '50/hour'
        throttle.scope = 'scrape'
        if not throttle.allow_request(request, self):
            return Response(
                {'error': 'Rate limit exceeded. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Запускаем асинхронную задачу
        task = scrape_single_competitor.delay(competitor.id)

        return Response({
            'message': f'Scraping started for {competitor.username}',
            'task_id': task.id,
            'competitor_id': competitor.id,
        })

    @action(detail=False, methods=['post'])
    def scrape_all(self, request):
        """
        Запустить парсинг постов для всех активных конкурентов.
        POST /api/competitors/scrape_all/
        """
        from .tasks import scrape_competitor_posts
        from rest_framework.throttling import ScopedRateThrottle

        # Rate limit: 10 scrape_all per hour per user
        throttle = ScopedRateThrottle()
        throttle.rate = '10/hour'
        throttle.scope = 'scrape'
        if not throttle.allow_request(request, self):
            return Response(
                {'error': 'Rate limit exceeded. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Запускаем асинхронную задачу
        task = scrape_competitor_posts.delay()

        return Response({
            'message': 'Scraping started for all active competitors',
            'task_id': task.id,
        })


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления системными настройками.
    Только один объект настроек (singleton).
    """
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Только чтение и обновление

    def get_queryset(self):  # type: ignore[override]
        # Возвращаем только один объект настроек
        return SystemSettings.objects.all()
    
    def get_object(self):
        # Всегда возвращаем единственный объект настроек
        return SystemSettings.get_settings()
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Получить текущие настройки системы.
        GET /api/settings/current/
        """
        settings = SystemSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class WorkspaceActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления активностями клиентов.
    """
    serializer_class = WorkspaceActivitySerializer
    permission_classes = [permissions.IsAuthenticated, ActivityPermission]

    def get_queryset(self):  # type: ignore[override]
        # Показываем только активности workspace, где пользователь является участником
        return WorkspaceActivity.objects.filter(
            workspace__members__user=self.request.user
        ).select_related('workspace', 'created_by').distinct()

    def perform_create(self, serializer):
        # Автоматически устанавливаем created_by
        serializer.save(created_by=self.request.user)


from rest_framework.views import APIView
from django.db.models import Count, Q
from datetime import timedelta
from django.utils import timezone

User = get_user_model()


class CurrentUserView(APIView):
    """
    Эндпоинт для получения информации о текущем пользователе.
    GET /api/auth/me/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        })


class AdminStatsView(APIView):
    """
    Эндпоинт для получения статистики админки.
    GET /api/admin/stats/
    Доступ только для суперпользователей (is_staff=True)
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # Общие показатели
        total_workspaces = Workspace.objects.count()
        total_posts = Post.objects.count()
        
        # Статусы постов
        posts_by_status = Post.objects.values('status').annotate(count=Count('id'))
        status_stats = {item['status']: item['count'] for item in posts_by_status}
        
        # Посты за последние 7 дней
        week_ago = timezone.now() - timedelta(days=7)
        recent_posts = Post.objects.filter(created_at__gte=week_ago).count()
        
        # Посты по платформам
        posts_by_platform = Post.objects.values('platform').annotate(count=Count('id'))
        platform_stats = {item['platform']: item['count'] for item in posts_by_platform}
        
        # Последние посты
        latest_posts = Post.objects.select_related('workspace').order_by('-created_at')[:10]
        latest_posts_data = [{
            'id': p.id,
            'title': p.title,
            'status': p.status,
            'platform': p.platform,
            'workspace_name': p.workspace.name if p.workspace else 'N/A',
            'created_at': p.created_at,
        } for p in latest_posts]
        
        # Топ воркспейсов по количеству постов
        top_workspaces = Workspace.objects.annotate(
            posts_count=Count('posts')
        ).order_by('-posts_count')[:5]
        
        top_workspaces_data = [{
            'id': w.id,
            'name': w.name,
            'posts_count': w.posts_count,
            'is_client': w.is_client,
        } for w in top_workspaces]
        
        return Response({
            'total_workspaces': total_workspaces,
            'total_posts': total_posts,
            'recent_posts_week': recent_posts,
            'status_stats': status_stats,
            'platform_stats': platform_stats,
            'latest_posts': latest_posts_data,
            'top_workspaces': top_workspaces_data,
        })


class AdminApiErrorsView(APIView):
    """
    Статистика ошибок API для админки.
    GET /api/admin/api-errors/
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)

        # Ошибки за сегодня
        today_errors = ApiCallLog.objects.filter(
            success=False,
            created_at__gte=today
        )
        today_error_count = today_errors.count()

        # Ошибки за неделю
        week_errors = ApiCallLog.objects.filter(
            success=False,
            created_at__gte=week_ago
        )
        week_error_count = week_errors.count()

        # Общие вызовы за сегодня
        today_total = ApiCallLog.objects.filter(created_at__gte=today).count()

        # Топ ошибок по платформам
        platform_errors = {}
        for platform in ['instagram', 'tiktok', 'youtube', 'linkedin']:
            count = ApiCallLog.objects.filter(
                platform=platform,
                success=False,
                created_at__gte=today
            ).count()
            if count > 0:
                platform_errors[platform] = count

        # Последние ошибки
        recent_errors = []
        for log in today_errors.select_related('user').order_by('-created_at')[:10]:
            recent_errors.append({
                'id': log.id,
                'username': log.user.username if log.user else 'anonymous',
                'platform': log.platform,
                'url': log.url[:80] + '...' if len(log.url) > 80 else log.url,
                'error_message': log.error_message[:150] if log.error_message else '',
                'created_at': log.created_at,
            })

        # Топ пользователей по ошибкам
        top_error_users = []
        from django.db.models import Count
        for entry in ApiCallLog.objects.filter(
            success=False,
            created_at__gte=today,
            user__isnull=False
        ).values('user__username').annotate(
            error_count=Count('id')
        ).order_by('-error_count')[:5]:
            top_error_users.append({
                'username': entry['user__username'],
                'error_count': entry['error_count'],
            })

        return Response({
            'today_total': today_total,
            'today_errors': today_error_count,
            'week_errors': week_error_count,
            'success_rate': round((1 - today_error_count / max(today_total, 1)) * 100, 1),
            'platform_errors': platform_errors,
            'recent_errors': recent_errors,
            'top_error_users': top_error_users,
        })


class AdminUsersView(APIView):
    """
    Список пользователей для админки.
    GET /api/admin/users/
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users_qs = User.objects.annotate(
            workspaces_count=Count('workspace_memberships__workspace', distinct=True),
            posts_count=Count('posts', distinct=True),
        ).order_by('-date_joined')

        users_data = []
        for user in users_qs:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined,
                'workspaces_count': user.workspaces_count,
                'posts_count': user.posts_count,
            })

        return Response({
            'total_users': users_qs.count(),
            'active_users': users_qs.filter(is_active=True).count(),
            'users': users_data,
        })


class AdminRevokeUserView(APIView):
    """
    Отозвать аккаунт пользователя (деактивировать).
    POST /api/admin/users/<user_id>/revoke/
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id: int):
        if request.user.id == user_id:
            return Response(
                {'detail': 'You cannot revoke your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_superuser:
            return Response(
                {'detail': 'Superuser account cannot be revoked from this action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'detail': 'Account revoked.', 'user_id': user.id})



class InviteTokenViewSet(viewsets.ModelViewSet):
    """ViewSet для управления токенами приглашений (только админы)"""
    serializer_class = InviteTokenSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return InviteToken.objects.filter(
            models.Q(created_by=self.request.user) |
            models.Q(workspace__members__user=self.request.user)
        ).distinct().select_related('workspace', 'created_by').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


from rest_framework_simplejwt.tokens import RefreshToken


class RegisterView(APIView):
    """
    Регистрация пользователя с токеном приглашения.
    POST /api/auth/register/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_201_CREATED)


class IssueAccountView(APIView):
    """
    Выдать пользователю аккаунт без админки и без инвайта.
    POST /api/auth/issue-account/
    Доступ: авторизованный owner/admin workspace.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = IssueAccountSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        workspace = serializer.validated_data.get('workspace')
        if workspace:
            role = get_member_role(request.user, workspace.id)
            if role not in ('owner', 'admin'):
                raise PermissionDenied('Only owner/admin can issue accounts for this workspace.')

        user = serializer.save()
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_201_CREATED)


class PostNoteViewSet(viewsets.ModelViewSet):
    serializer_class = PostNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PostNote.objects.filter(
            post__workspace__members__user=self.request.user
        ).distinct().select_related('author', 'post').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ApiCallLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ApiCallLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        from django.db.models import Q
        qs = ApiCallLog.objects.all().select_related('user').order_by('-created_at')
        user_id = self.request.GET.get('user_id')
        platform = self.request.GET.get('platform')
        date_from = self.request.GET.get('date_from')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if platform:
            qs = qs.filter(platform=platform)
        if date_from:
            from datetime import datetime
            try:
                qs = qs.filter(created_at__gte=datetime.fromisoformat(date_from))
            except ValueError:
                pass
        return qs
