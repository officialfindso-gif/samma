"""Добавить InviteTokenViewSet и RegisterView в views.py"""
import os
path = os.path.join(os.path.dirname(__file__), 'views.py')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Если уже есть InviteTokenViewSet - не добавляем
if 'InviteTokenViewSet' in content:
    print('InviteTokenViewSet already exists')
    exit()

new_code = """


class InviteTokenViewSet(viewsets.ModelViewSet):
    \"\"\"ViewSet для управления токенами приглашений\"\"\"
    serializer_class = InviteTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InviteToken.objects.filter(
            models.Q(created_by=self.request.user) |
            models.Q(workspace__members__user=self.request.user)
        ).distinct().select_related('workspace', 'created_by').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


from rest_framework_simplejwt.tokens import RefreshToken


class RegisterView(APIView):
    \"\"\"
    Регистрация пользователя с токеном приглашения.
    POST /api/auth/register/
    \"\"\"
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
"""

with open(path, 'a', encoding='utf-8') as f:
    f.write(new_code)
print('Done')
