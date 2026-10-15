from django.contrib import admin
from .models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    EMobilityCompliance,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductSpecificationInline(admin.TabularInline):
    model = ProductSpecification
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class EMobilityComplianceInline(admin.StackedInline):
    model = EMobilityCompliance
    can_delete = False
    verbose_name = 'StVZO / eKFV E-Mobilitätsprüfung'


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'currency', 'stock', 'category', 'brand', 'status', 'featured')
    list_filter = ('status', 'featured', 'is_new', 'category', 'brand')
    search_fields = ('name', 'id', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [
        ProductImageInline,
        ProductSpecificationInline,
        ProductVariantInline,
        EMobilityComplianceInline,
    ]


@admin.register(EMobilityCompliance)
class EMobilityComplianceAdmin(admin.ModelAdmin):
    list_display = ('product', 'road_legal', 'abe_available', 'insurance_required', 'max_speed_kmh')
    list_filter = ('road_legal', 'abe_available', 'insurance_required')
