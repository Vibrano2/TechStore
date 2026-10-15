from django.contrib import admin
from .models import LegalNotice, WarrantyClaim


@admin.register(LegalNotice)
class LegalNoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'notice_type', 'last_updated')
    list_filter = ('notice_type',)
    search_fields = ('title', 'content')


@admin.register(WarrantyClaim)
class WarrantyClaimAdmin(admin.ModelAdmin):
    list_display = ('claim_number', 'customer_name', 'customer_email', 'product', 'defect_category', 'remedy_preference', 'status', 'created_at')
    list_filter = ('status', 'defect_category', 'remedy_preference', 'created_at')
    search_fields = ('claim_number', 'order_id', 'customer_email', 'customer_name', 'serial_number')
    readonly_fields = ('created_at', 'updated_at')

