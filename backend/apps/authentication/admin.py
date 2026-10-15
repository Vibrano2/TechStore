from django.contrib import admin
from .models import UserProfile, EmailOTP, AuthToken


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'city', 'language', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'phone')


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'attempts', 'is_verified', 'created_at', 'expires_at')
    search_fields = ('email',)
    list_filter = ('is_verified',)


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'key', 'created_at', 'expires_at')
    search_fields = ('user__email', 'user__username')
