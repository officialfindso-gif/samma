from django.contrib import admin
from .models import (
    Workspace,
    WorkspaceMember,
    SocialAccount,
    Post,
    Prompt,
    SubscriptionPlan,
    UserSubscription,
    SubscriptionFeature,
    CompetitorAccount,
    SystemSettings,
    WorkspaceActivity,
    InviteToken,
)


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'owner',
        'is_client',
        'client_name',
        'tags',
        'posts_count',
        'seats_limit',
        'created_at'
    )
    list_filter = ('is_client', 'created_at')
    search_fields = ('name', 'client_name', 'tags', 'owner__username', 'owner__email')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'owner', 'seats_limit')
        }),
        ('Информация о клиенте', {
            'fields': ('is_client', 'client_name', 'client_contact', 'client_notes', 'color', 'tags')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    @admin.display(description='Постов')
    def posts_count(self, obj):
        return obj.posts.count()


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'user', 'role', 'joined_at')
    list_filter = ('role', 'workspace')


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'platform', 'username', 'created_at')
    list_filter = ('platform', 'workspace')

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'title', 'platform', 'status', 'created_at')
    list_filter = ('workspace', 'platform', 'status')
    search_fields = ('title', 'source_url')


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'name', 'type', 'is_active', 'created_at')
    list_filter = ('workspace', 'type', 'is_active')
    search_fields = ('name',)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'period_months', 'max_workspaces', 'max_seats_per_workspace', 'is_active', 'created_at')
    list_filter = ('is_active', 'period_months', 'created_at')
    search_fields = ('name', 'description')


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'plan', 'workspace', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'start_date', 'end_date')
    search_fields = ('user__username', 'plan__name', 'workspace__name')


@admin.register(SubscriptionFeature)
class SubscriptionFeatureAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'feature_name', 'feature_value')
    list_filter = ('plan',)
    search_fields = ('plan__name', 'feature_name', 'feature_value')


@admin.register(CompetitorAccount)
class CompetitorAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'platform', 'username', 'is_active', 'last_scraped_at', 'created_at')
    list_filter = ('workspace', 'platform', 'is_active', 'created_at')
    search_fields = ('username', 'url', 'notes')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'auto_scraping_enabled', 'scraping_hour', 'scraping_minute', 'last_scraping_check', 'updated_at')
    readonly_fields = ('created_at', 'updated_at', 'last_scraping_check')
    
    def has_add_permission(self, request):
        # Разрешаем создание только если нет объектов
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Запрещаем удаление
        return False


@admin.register(WorkspaceActivity)
class WorkspaceActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'workspace', 'activity_type', 'title', 'created_by', 'created_at')
    list_filter = ('workspace', 'activity_type', 'created_at')
    search_fields = ('title', 'description', 'workspace__name')
    readonly_fields = ('created_at',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "workspace":
            kwargs["queryset"] = Workspace.objects.filter(members__user=request.user).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'token_short', 'workspace', 'role', 'email', 'used', 'is_expired', 'created_by', 'created_at')
    list_filter = ('used', 'workspace', 'role', 'created_at')
    search_fields = ('token', 'email', 'workspace__name')
    readonly_fields = ('token', 'created_at', 'is_expired')
    fieldsets = (
        ('Токен', {
            'fields': ('token', 'email', 'workspace', 'role')
        }),
        ('Статус', {
            'fields': ('used', 'used_by', 'expires_at', 'is_expired')
        }),
        ('Создание', {
            'fields': ('created_by', 'created_at')
        }),
    )

    def token_short(self, obj):
        return f'{obj.token[:8]}...'
    token_short.short_description = 'Токен'

    def is_expired(self, obj):
        return obj.is_expired
    is_expired.short_description = 'Истёк'
    is_expired.boolean = True

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "workspace":
            kwargs["queryset"] = Workspace.objects.filter(members__user=request.user).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
