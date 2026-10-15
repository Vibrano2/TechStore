from rest_framework.routers import DefaultRouter
from .views import CartViewSet, OrderViewSet, OrderReturnViewSet

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'returns', OrderReturnViewSet, basename='return')

urlpatterns = router.urls

