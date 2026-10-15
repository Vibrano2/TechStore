"""
Django settings for TechStore Germany Backend.

Configured for:
- Local development (SQLite default)
- cPanel / Production deployment (MySQL/PostgreSQL via environment variables, Passenger WSGI support)
- German e-commerce market requirements (EUR currency, German locale, StVZO/eKFV compliance)
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-techstore-germany-2026-safe-dev-key-change-in-prod-xyz'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',')



INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'apps.catalogue.apps.CatalogueConfig',
    'apps.orders.apps.OrdersConfig',
    'apps.compliance.apps.ComplianceConfig',
    'apps.authentication.apps.AuthenticationConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'techstore_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'techstore_backend.wsgi.application'


DB_ENGINE = os.environ.get('DB_ENGINE', 'sqlite')

if DB_ENGINE == 'mysql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('DB_NAME', 'techstore_db'),
            'USER': os.environ.get('DB_USER', 'techstore_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }
elif DB_ENGINE == 'postgresql' or DB_ENGINE == 'postgres':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'techstore_db'),
            'USER': os.environ.get('DB_USER', 'techstore_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'de-de'
TIME_ZONE = 'Europe/Berlin'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.authentication.TechStoreTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 24,
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%SZ',
}

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.environ.get('RESEND_FROM_EMAIL', 'TechnikWelt Germany <onboarding@resend.dev>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:5174')

# Canonical German Company Legal Identity (§ 5 DDG, § 14 UStG, GoBD)
COMPANY_NAME = os.environ.get('COMPANY_NAME', 'TechnikWelt GmbH')
COMPANY_STREET = os.environ.get('COMPANY_STREET', 'Maximilianstraße 35')
COMPANY_CITY = os.environ.get('COMPANY_CITY', '80539 München')
COMPANY_COUNTRY = os.environ.get('COMPANY_COUNTRY', 'Deutschland')
COMPANY_REGISTER = os.environ.get('COMPANY_REGISTER', 'Amtsgericht München HRB 284910')
COMPANY_VAT_ID = os.environ.get('COMPANY_VAT_ID', 'DE 362 891 042')
COMPANY_MANAGING_DIRECTOR = os.environ.get('COMPANY_MANAGING_DIRECTOR', 'Dr. Markus Lindemann')
COMPANY_SUPPORT_EMAIL = os.environ.get('COMPANY_SUPPORT_EMAIL', 'kontakt@technikwelt.shop')
COMPANY_PHONE = os.environ.get('COMPANY_PHONE', '+49 (0) 89 2154 7890')
COMPANY_BANK_BENEFICIARY = os.environ.get('COMPANY_BANK_BENEFICIARY', 'TechnikWelt GmbH')
COMPANY_BANK_IBAN = os.environ.get('COMPANY_BANK_IBAN', 'DE38 7602 6000 0039 4791 00')
COMPANY_BANK_BIC = os.environ.get('COMPANY_BANK_BIC', 'NORSDE71XXX')

STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '').strip()
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '').strip()
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '').strip()
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:5173').rstrip('/')


EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.resend.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'resend')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', RESEND_API_KEY)
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
DEFAULT_FROM_EMAIL = RESEND_FROM_EMAIL
SERVER_EMAIL = RESEND_FROM_EMAIL


CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://technikwelt.shop',
    'https://www.technikwelt.shop',
    'http://technikwelt.shop',
    'http://www.technikwelt.shop',
]

CSRF_TRUSTED_ORIGINS = [
    'https://technikwelt.shop',
    'https://www.technikwelt.shop',
    'http://technikwelt.shop',
    'http://www.technikwelt.shop',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
