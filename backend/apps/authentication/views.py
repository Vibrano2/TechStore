from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import SendOTPSerializer, VerifyOTPSerializer, UserProfileSerializer
from .services import send_otp_email, verify_otp_and_login
from .models import AuthToken


import logging

logger = logging.getLogger('techstore.auth.views')


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            serializer = SendOTPSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            email = serializer.validated_data['email']
            result = send_otp_email(email)

            if not result.get('success'):
                return Response(
                    result,
                    status=status.HTTP_429_TOO_MANY_REQUESTS if 'cooldown_seconds' in result else status.HTTP_400_BAD_REQUEST
                )

            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Unexpected error in SendOTPView: {e}")
            return Response({
                "success": False,
                "error": "Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es in Kürze erneut."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            serializer = VerifyOTPSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data
            result = verify_otp_and_login(
                email=data['email'],
                code=data['otp'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                language=data.get('language', 'de')
            )

            if not result.get('success'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Unexpected error in VerifyOTPView: {e}")
            return Response({
                "success": False,
                "error": "Fehler bei der Code-Überprüfung. Bitte versuchen Sie es erneut."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split()
        if len(parts) == 2:
            AuthToken.objects.filter(key=parts[1]).delete()
        return Response({
            "success": True,
            "message": "Erfolgreich abgemeldet."
        }, status=status.HTTP_200_OK)
