from decimal import Decimal
import secrets
from django.db import models
from django.db.models import Q
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Brand, Product, ProductReview
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductReviewSerializer,
    CreateProductReviewSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().prefetch_related('products')
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    lookup_field = 'slug'


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(status='active').select_related(
        'category', 'brand', 'emobility_compliance'
    ).prefetch_related('images', 'specifications', 'variants')
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]

        try:
            return self.get_queryset().get(slug=lookup_value)
        except Product.DoesNotExist:
            return self.get_queryset().get(id=lookup_value)

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        category = params.get('category')
        if category:
            qs = qs.filter(Q(category__slug__iexact=category) | Q(category__name__iexact=category))

        brand = params.get('brand')
        if brand:
            qs = qs.filter(Q(brand__slug__iexact=brand) | Q(brand__name__iexact=brand))

        road_legal = params.get('road_legal')
        if road_legal is not None:
            is_legal = road_legal.lower() in ('true', '1')
            qs = qs.filter(emobility_compliance__road_legal=is_legal)

        in_stock = params.get('in_stock')
        if in_stock and in_stock.lower() in ('true', '1'):
            qs = qs.filter(stock__gt=0)

        min_price = params.get('min_price')
        if min_price:
            try:
                qs = qs.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = params.get('max_price')
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except ValueError:
                pass

        search_query = params.get('q') or params.get('search')
        if search_query:
            qs = qs.filter(
                Q(name__icontains=search_query) |
                Q(short_description__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(brand__name__icontains=search_query)
            )

        sort = params.get('sort')
        if sort == 'price_asc':
            qs = qs.order_by('price')
        elif sort == 'price_desc':
            qs = qs.order_by('-price')
        elif sort == 'rating':
            qs = qs.order_by('-rating', '-review_count')
        elif sort == 'newest':
            qs = qs.order_by('-created_at')

        return qs

    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_products = self.get_queryset().filter(featured=True)[:8]
        serializer = ProductListSerializer(featured_products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def deals(self, request):
        deal_products = self.get_queryset().filter(original_price__isnull=False)[:8]
        serializer = ProductListSerializer(deal_products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='reviews')
    def reviews(self, request, slug=None):
        product = self.get_object()

        if request.method == 'GET':
            reviews_qs = product.reviews.filter(status='approved').order_by('-created_at')
            total = reviews_qs.count()

            distribution = []
            for star in [5, 4, 3, 2, 1]:
                count = reviews_qs.filter(rating=star).count()
                pct = round((count / total) * 100) if total > 0 else 0
                distribution.append({
                    "stars": star,
                    "count": count,
                    "percentage": pct
                })

            serializer = ProductReviewSerializer(reviews_qs, many=True)
            return Response({
                "productId": product.id,
                "averageRating": float(product.rating),
                "totalReviews": total,
                "distribution": distribution,
                "reviews": serializer.data
            })

        serializer = CreateProductReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user if request.user and request.user.is_authenticated else None
        author_email = data['author_email'].lower().strip()

        from apps.orders.models import Order
        is_verified = Order.objects.filter(
            Q(user=user) | Q(email__iexact=author_email),
            items__product=product,
            status__in=['confirmed', 'processing', 'shipped', 'delivered']
        ).exists()

        review_id = f"REV-{secrets.token_hex(4).upper()}"
        review = ProductReview.objects.create(
            id=review_id,
            product=product,
            user=user,
            author_name=data['author_name'].strip(),
            author_email=author_email,
            rating=data['rating'],
            title=data['title'].strip(),
            comment=data['comment'].strip(),
            is_verified_buyer=is_verified,
            status='approved',
        )

        approved_reviews = product.reviews.filter(status='approved')
        avg_rating = approved_reviews.aggregate(models.Avg('rating'))['rating__avg'] or data['rating']
        product.rating = Decimal(str(round(avg_rating, 1)))
        product.review_count = approved_reviews.count()
        product.save(update_fields=['rating', 'review_count'])

        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewViewSet(viewsets.GenericViewSet):
    queryset = ProductReview.objects.filter(status='approved')
    serializer_class = ProductReviewSerializer

    @action(detail=True, methods=['post'])
    def helpful(self, request, pk=None):
        review = ProductReview.objects.filter(id=pk).first()
        if not review:
            return Response({"error": "Bewertung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        review.helpful_count += 1
        review.save(update_fields=['helpful_count'])
        return Response({
            "id": review.id,
            "helpfulCount": review.helpful_count,
            "message": "Danke für Ihr Feedback!"
        })
