from django.urls import path
from .views import SendOTPView, VerifyOTPView, CurrentUserView, LogoutView
from .internal_views import (
    AdminLoginView,
    AdminMeView,
    AdminStatsView,
    AdminOrdersView,
    AdminOrderDetailView,
    AdminOrderStatusView,
    AdminOrderApprovePaymentView,
    AdminOrderRejectPaymentView,
    AdminOrderResendInvoiceView,
    AdminProductsView,
    AdminProductUpdateView,
    AdminReturnsView,
    AdminReturnStatusView,
    AdminWarrantyClaimsView,
    AdminWarrantyClaimStatusView,
    AdminCustomersView,
)

urlpatterns = [
    # Customer Auth
    path('auth/send-otp/', SendOTPView.as_view(), name='auth-send-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth-verify-otp'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/profile/', CurrentUserView.as_view(), name='auth-profile'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),

    # Internal Admin API
    path('intern/login/', AdminLoginView.as_view(), name='admin-login'),
    path('intern/me/', AdminMeView.as_view(), name='admin-me'),
    path('intern/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('intern/orders/', AdminOrdersView.as_view(), name='admin-orders'),
    path('intern/orders/<str:order_id>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('intern/orders/<str:order_id>/update-status/', AdminOrderStatusView.as_view(), name='admin-order-update-status'),
    path('intern/orders/<str:order_id>/approve-payment/', AdminOrderApprovePaymentView.as_view(), name='admin-order-approve-payment'),
    path('intern/orders/<str:order_id>/reject-payment/', AdminOrderRejectPaymentView.as_view(), name='admin-order-reject-payment'),
    path('intern/orders/<str:order_id>/resend-invoice/', AdminOrderResendInvoiceView.as_view(), name='admin-order-resend-invoice'),
    path('intern/products/', AdminProductsView.as_view(), name='admin-products'),
    path('intern/products/<str:product_id>/', AdminProductUpdateView.as_view(), name='admin-product-update'),
    path('intern/returns/', AdminReturnsView.as_view(), name='admin-returns'),
    path('intern/returns/<str:return_id>/update-status/', AdminReturnStatusView.as_view(), name='admin-return-update-status'),
    path('intern/warranty-claims/', AdminWarrantyClaimsView.as_view(), name='admin-warranty-claims'),
    path('intern/warranty-claims/<str:claim_id>/update-status/', AdminWarrantyClaimStatusView.as_view(), name='admin-warranty-claim-update-status'),
    path('intern/customers/', AdminCustomersView.as_view(), name='admin-customers'),
]
