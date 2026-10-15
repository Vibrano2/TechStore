from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import AuthToken


class TechStoreTokenAuthentication(BaseAuthentication):
    """
    Authenticate against AuthToken via header:
    Authorization: Bearer <token>
    or
    Authorization: Token <token>
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() not in ('bearer', 'token'):
            return None

        token_key = parts[1]
        try:
            token = AuthToken.objects.select_related('user').get(key=token_key)
        except AuthToken.DoesNotExist:
            raise AuthenticationFailed('Ungültiger oder abgelaufener Authentifizierungs-Token.')

        if not token.is_valid():
            token.delete()
            raise AuthenticationFailed('Token ist abgelaufen. Bitte erneut anmelden.')

        return (token.user, token)
