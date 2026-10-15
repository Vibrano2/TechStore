from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(min_length=6, max_length=6, required=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    language = serializers.ChoiceField(choices=['de', 'en', 'fr', 'es'], required=False, default='de')

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        cleaned = value.strip()
        if not cleaned.isdigit():
            raise serializers.ValidationError("Der OTP-Code muss genau 6 Ziffern enthalten.")
        return cleaned


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)
    language = serializers.CharField(source='profile.language', required=False)
    street = serializers.CharField(source='profile.street', required=False, allow_blank=True)
    house_number = serializers.CharField(source='profile.house_number', required=False, allow_blank=True)
    postal_code = serializers.CharField(source='profile.postal_code', required=False, allow_blank=True)
    city = serializers.CharField(source='profile.city', required=False, allow_blank=True)
    country = serializers.CharField(source='profile.country', required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'language', 'street', 'house_number', 'postal_code', 'city', 'country',
            'date_joined'
        ]
        read_only_fields = ['id', 'email', 'date_joined']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.email

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})

        if 'first_name' in validated_data:
            instance.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            instance.last_name = validated_data['last_name']
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for key, val in profile_data.items():
            setattr(profile, key, val)
        profile.save()

        return instance
