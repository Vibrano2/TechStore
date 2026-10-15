import binascii
import os
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True, default='')
    language = models.CharField(max_length=5, default='de', choices=[('de', 'Deutsch'), ('en', 'English'), ('fr', 'Français'), ('es', 'Español')])
    street = models.CharField(max_length=150, blank=True, default='')
    house_number = models.CharField(max_length=20, blank=True, default='')
    postal_code = models.CharField(max_length=10, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=10, default='DE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profil von {self.user.email or self.user.username}"


class EmailOTP(models.Model):
    email = models.EmailField(db_index=True)
    otp_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', '-created_at']),
        ]

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def __str__(self):
        status = "Gültig" if not self.is_expired() and not self.is_verified else "Abgelaufen/Verifiziert"
        return f"OTP für {self.email} ({status})"


class AuthToken(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @classmethod
    def generate_key(cls) -> str:
        return binascii.hexlify(os.urandom(32)).decode()

    @classmethod
    def create_for_user(cls, user: User, days_valid: int = 30) -> 'AuthToken':
        # Clean up expired tokens for this user
        cls.objects.filter(user=user, expires_at__lt=timezone.now()).delete()
        key = cls.generate_key()
        expires_at = timezone.now() + timedelta(days=days_valid)
        return cls.objects.create(key=key, user=user, expires_at=expires_at)

    def is_valid(self) -> bool:
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"Token ({self.user.username}) bis {self.expires_at}"
