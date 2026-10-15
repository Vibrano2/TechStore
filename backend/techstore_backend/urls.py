"""
URL configuration for TechStore Germany Backend.
All API endpoints are mounted under /api/v1/ as per ARCHITECTURE.md.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def api_root_view(request):
    return JsonResponse({
        "status": "online",
        "market": "Germany (DE)",
        "currency": "EUR",
        "version": "v1",
        "endpoints": {
            "products": "/api/v1/products/",
            "categories": "/api/v1/categories/",
            "brands": "/api/v1/brands/",
            "cart": "/api/v1/cart/",
            "orders": "/api/v1/orders/",
            "returns": "/api/v1/returns/",
            "auth": {
                "send_otp": "/api/v1/auth/send-otp/",
                "verify_otp": "/api/v1/auth/verify-otp/",
                "me": "/api/v1/auth/me/",
                "logout": "/api/v1/auth/logout/",
            },
            "legal": "/api/v1/legal/",
            "warranty_claims": "/api/v1/warranty-claims/",
            "admin": "/admin/",
        }
    })


urlpatterns = [
    path('', api_root_view, name='root-health'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.catalogue.urls')),
    path('api/v1/', include('apps.orders.urls')),
    path('api/v1/', include('apps.compliance.urls')),
    path('api/v1/', include('apps.authentication.urls')),
]
