from rest_framework import serializers
from .models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    EMobilityCompliance,
    ProductReview,
)


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'product_count']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'order']


class ProductSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSpecification
        fields = ['id', 'name', 'value', 'group']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'sku', 'price', 'stock', 'vat_rate']


class EMobilityComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMobilityCompliance
        fields = [
            'road_legal',
            'abe_available',
            'insurance_required',
            'registration_required',
            'intended_use',
            'max_speed_kmh'
        ]


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name')
    category_slug = serializers.CharField(source='category.slug')
    brand = serializers.CharField(source='brand.name', default='')
    images = serializers.SerializerMethodField()
    emobility_compliance = EMobilityComplianceSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'name',
            'brand',
            'category',
            'category_slug',
            'short_description',
            'price',
            'original_price',
            'currency',
            'rating',
            'review_count',
            'stock',
            'warranty',
            'delivery',
            'images',
            'badges',
            'featured',
            'is_new',
            'emobility_compliance',
        ]

    def get_images(self, obj):
        return [img.url for img in obj.images.all()]


class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name')
    category_slug = serializers.CharField(source='category.slug')
    brand = serializers.CharField(source='brand.name', default='')
    images = serializers.SerializerMethodField()
    specifications = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    emobility_compliance = EMobilityComplianceSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'name',
            'brand',
            'category',
            'category_slug',
            'short_description',
            'description',
            'price',
            'original_price',
            'currency',
            'rating',
            'review_count',
            'stock',
            'warranty',
            'delivery',
            'images',
            'badges',
            'featured',
            'is_new',
            'status',
            'specifications',
            'variants',
            'emobility_compliance',
            'created_at',
            'updated_at',
        ]

    def get_images(self, obj):
        return [img.url for img in obj.images.all()]

    def get_specifications(self, obj):
        # Format as key-value mapping to seamlessly match frontend expectations
        return {spec.name: spec.value for spec in obj.specifications.all()}


class ProductReviewSerializer(serializers.ModelSerializer):
    productId = serializers.CharField(source='product_id', read_only=True)
    authorName = serializers.CharField(source='author_name')
    isVerifiedBuyer = serializers.BooleanField(source='is_verified_buyer', read_only=True)
    helpfulCount = serializers.IntegerField(source='helpful_count', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            'id',
            'productId',
            'authorName',
            'rating',
            'title',
            'comment',
            'isVerifiedBuyer',
            'helpfulCount',
            'createdAt',
        ]


class CreateProductReviewSerializer(serializers.Serializer):
    author_name = serializers.CharField(max_length=100, min_length=2)
    author_email = serializers.EmailField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(max_length=200, min_length=2)
    comment = serializers.CharField(min_length=10, max_length=2000)
