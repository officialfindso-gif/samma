from rest_framework import serializers
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


class WorkspaceSerializer(serializers.ModelSerializer):
    posts_count = serializers.IntegerField(read_only=True)
    tags_list = serializers.SerializerMethodField()
    recent_activities = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'seats_limit', 'is_client', 'client_name',
            'client_contact', 'client_notes', 'color', 'tags', 'tags_list',
            'created_at', 'updated_at', 'posts_count', 'recent_activities',
        ]

    def get_tags_list(self, obj):
        return obj.get_tags_list()

    def get_recent_activities(self, obj):
        # Prefetched by ViewSet, no extra query
        activities = getattr(obj, '_prefetched_activities', [])[:5]
        return [{
            'id': a.id, 'type': a.activity_type, 'title': a.title,
            'description': a.description, 'created_at': a.created_at,
        } for a in activities]


class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = [
            'id', 'workspace', 'social_account', 'title', 'source_url',
            'platform', 'status', 'error_message', 'original_text', 'transcript',
            'generated_caption', 'generated_script', 'generated_title',
            'generated_description', 'description', 'caption_prompt',
            'views_count', 'likes_count', 'comments_count', 'shares_count',
            'engagement_rate', 'video_duration', 'published_at',
            'play_count', 'saves_count', 'author_followers', 'has_audio', 'is_video',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'error_message', 'views_count', 'likes_count',
            'comments_count', 'shares_count', 'engagement_rate', 'video_duration',
            'published_at', 'play_count', 'saves_count', 'author_followers',
            'has_audio', 'is_video', 'created_at', 'updated_at',
        ]

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace

    def validate(self, attrs):
        workspace = attrs.get('workspace') or getattr(self.instance, 'workspace', None)
        caption_prompt = attrs.get('caption_prompt', None)
        if caption_prompt and workspace and caption_prompt.workspace_id != workspace.id:
            raise serializers.ValidationError({'caption_prompt': 'Prompt must belong to this workspace.'})

        # SSRF protection: validate source_url
        source_url = attrs.get('source_url')
        if source_url:
            from urllib.parse import urlparse
            parsed = urlparse(source_url)
            # Block internal/private IP ranges
            blocked_hosts = [
                'localhost', '127.0.0.1', '0.0.0.0', '::1',
                '169.254.169.254',  # AWS metadata
                'metadata.google.internal',  # GCP metadata
            ]
            if parsed.hostname and parsed.hostname.lower() in blocked_hosts:
                raise serializers.ValidationError({
                    'source_url': 'URL points to a restricted host.'
                })
            # Block private IP ranges
            if parsed.hostname:
                import ipaddress
                try:
                    ip = ipaddress.ip_address(parsed.hostname)
                    if ip.is_private or ip.is_loopback or ip.is_link_local:
                        raise serializers.ValidationError({
                            'source_url': 'URL points to a private/internal network.'
                        })
                except ValueError:
                    pass  # Not an IP address, allow domain names

        return attrs


class PromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prompt
        fields = ['id', 'workspace', 'name', 'type', 'content', 'is_active', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields['type'].read_only = True
        return fields

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'description', 'price', 'period_months', 'max_workspaces', 'max_seats_per_workspace', 'max_posts_per_month', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSubscription
        fields = ['id', 'user', 'plan', 'workspace', 'start_date', 'end_date', 'is_active', 'stripe_subscription_id', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace


class SubscriptionFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionFeature
        fields = ['id', 'plan', 'feature_name', 'feature_value', 'description']


class CompetitorAccountSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)

    class Meta:
        model = CompetitorAccount
        fields = ['id', 'workspace', 'workspace_name', 'platform', 'username', 'url', 'is_active', 'last_scraped_at', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['last_scraped_at', 'created_at', 'updated_at']

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id',
            'auto_scraping_enabled',
            'scraping_hour',
            'scraping_minute',
            'max_parse_depth',
            'max_workspaces_per_user',
            'max_api_calls_per_day',
            'last_scraping_check',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['last_scraping_check', 'created_at', 'updated_at']

    def validate_scraping_hour(self, value):
        if value < 0 or value > 23:
            raise serializers.ValidationError('Hour must be 0-23')
        return value

    def validate_scraping_minute(self, value):
        if value < 0 or value > 59:
            raise serializers.ValidationError('Minute must be 0-59')
        return value


class WorkspaceActivitySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)

    class Meta:
        model = WorkspaceActivity
        fields = ['id', 'workspace', 'workspace_name', 'activity_type', 'title', 'description', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace


from django.contrib.auth import get_user_model
User = get_user_model()


class InviteTokenSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = InviteToken
        fields = ['id', 'token', 'email', 'workspace', 'workspace_name', 'role', 'expires_at', 'used', 'created_by', 'created_by_name', 'created_at', 'is_expired']
        read_only_fields = ['token', 'used', 'created_by', 'created_at', 'is_expired']

    def validate_workspace(self, workspace):
        user = self.context['request'].user
        if not WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            raise serializers.ValidationError('You are not a member of this workspace.')
        return workspace


class RegisterSerializer(serializers.ModelSerializer):
    invite_token = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'invite_token']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_invite_token(self, value):
        try:
            token_obj = InviteToken.objects.get(token=value)
        except InviteToken.DoesNotExist:
            raise serializers.ValidationError('Invalid token')
        if token_obj.used:
            raise serializers.ValidationError('Token already used')
        if token_obj.is_expired:
            raise serializers.ValidationError('Token expired')
        return token_obj

    def create(self, validated_data):
        invite_token = validated_data.pop('invite_token')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
        )
        WorkspaceMember.objects.create(
            workspace=invite_token.workspace,
            user=user,
            role=invite_token.role,
        )
        invite_token.used = True
        invite_token.used_by = user
        invite_token.save(update_fields=['used', 'used_by'])

        # Создаём личный воркспейс с дефолтными промптами
        ws_name = f'{user.username}\'s Workspace'
        workspace = Workspace.objects.create(
            name=ws_name,
            owner=user,
            seats_limit=1,
        )
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role='owner',
        )

        # Дефолтные промпты
        from .management.commands.setup_default_prompts import DEFAULT_PROMPTS
        for prompt_data in DEFAULT_PROMPTS:
            Prompt.objects.create(
                workspace=workspace,
                name=prompt_data['name'],
                type=prompt_data['type'],
                content=prompt_data['content'],
                is_default=prompt_data['is_default'],
            )

        return user


class PostNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True, allow_null=True)

    class Meta:
        model = PostNote
        fields = ['id', 'post', 'content', 'author', 'author_name', 'created_at', 'updated_at']
        read_only_fields = ['post', 'author', 'created_at', 'updated_at']


class ApiCallLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)

    class Meta:
        model = ApiCallLog
        fields = ['id', 'user', 'username', 'platform', 'url', 'success', 'error_message', 'created_at']
        read_only_fields = ['created_at']
