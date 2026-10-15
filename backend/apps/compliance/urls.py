from rest_framework.routers import DefaultRouter
from .views import LegalNoticeViewSet, WarrantyClaimViewSet

router = DefaultRouter()
router.register(r'legal', LegalNoticeViewSet, basename='legal-notice')
router.register(r'warranty-claims', WarrantyClaimViewSet, basename='warranty-claim')

urlpatterns = router.urls
