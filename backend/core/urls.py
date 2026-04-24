from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas.views import (
    WorkspaceViewSet,
    PostViewSet,
    PromptViewSet,
    SubscriptionPlanViewSet,
    UserSubscriptionViewSet,
    SubscriptionFeatureViewSet,
    CompetitorAccountViewSet,
    SystemSettingsViewSet,
    WorkspaceActivityViewSet,
    InviteTokenViewSet,
    AdminStatsView,
    AdminApiErrorsView,
    AdminUsersView,
    AdminRevokeUserView,
    CurrentUserView,
    RegisterView,
    IssueAccountView,
    PostNoteViewSet,
    ApiCallLogViewSet,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'posts', PostViewSet, basename='post')
router.register(r'post-notes', PostNoteViewSet, basename='post-note')
router.register(r'prompts', PromptViewSet, basename='prompt')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'user-subscriptions', UserSubscriptionViewSet, basename='user-subscription')
router.register(r'subscription-features', SubscriptionFeatureViewSet, basename='subscription-feature')
router.register(r'competitors', CompetitorAccountViewSet, basename='competitor')
router.register(r'settings', SystemSettingsViewSet, basename='settings')
router.register(r'activities', WorkspaceActivityViewSet, basename='activity')
router.register(r'invites', InviteTokenViewSet, basename='invite')
router.register(r'api-logs', ApiCallLogViewSet, basename='api-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/issue-account/', IssueAccountView.as_view(), name='issue_account'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('api/admin/api-errors/', AdminApiErrorsView.as_view(), name='admin_api_errors'),
    path('api/admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('api/admin/users/<int:user_id>/revoke/', AdminRevokeUserView.as_view(), name='admin_revoke_user'),
    path('api/', include(router.urls)),
]
