from django.urls import path
from .views import SendOTPView, VerifyOTPView, CurrentUserView, LogoutView

urlpatterns = [
    path('auth/send-otp/', SendOTPView.as_view(), name='auth-send-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth-verify-otp'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/profile/', CurrentUserView.as_view(), name='auth-profile'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
]
