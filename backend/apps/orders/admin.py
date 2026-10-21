from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem, OrderReturn, ManualBankDetails


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'variant', 'product_name', 'quantity', 'unit_price', 'tax_amount')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'grand_total', 'currency', 'status', 'payment_status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_status', 'payment_method', 'created_at')
    search_fields = ('id', 'email', 'last_name', 'tracking_number')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderItemInline]


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'session_key', 'total_items', 'subtotal', 'updated_at')
    inlines = [CartItemInline]


@admin.register(OrderReturn)
class OrderReturnAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'customer_name', 'customer_email', 'reason', 'status', 'refund_amount', 'refund_method', 'return_tracking_number', 'created_at')
    list_filter = ('status', 'reason', 'refund_method', 'created_at')
    search_fields = ('id', 'order__id', 'customer_name', 'customer_email', 'return_tracking_number')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ManualBankDetails)
class ManualBankDetailsAdmin(admin.ModelAdmin):
    list_display = ('beneficiary', 'iban', 'bic', 'bank_name', 'is_active', 'updated_at')
    list_editable = ('is_active',)

