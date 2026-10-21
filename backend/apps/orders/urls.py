from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, OrderViewSet, OrderReturnViewSet, PublicBankDetailsView

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'returns', OrderReturnViewSet, basename='return')

urlpatterns = [
    path('bank-details/', PublicBankDetailsView.as_view(), name='public-bank-details'),
] + router.urls

