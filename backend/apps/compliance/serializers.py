from rest_framework import serializers
from .models import LegalNotice, WarrantyClaim


class LegalNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalNotice
        fields = ['id', 'notice_type', 'title', 'content', 'last_updated']


class WarrantyClaimSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    defect_category_display = serializers.CharField(source='get_defect_category_display', read_only=True)
    remedy_preference_display = serializers.CharField(source='get_remedy_preference_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WarrantyClaim
        fields = [
            'id',
            'claim_number',
            'customer_email',
            'customer_name',
            'order_id',
            'product',
            'product_name',
            'serial_number',
            'defect_category',
            'defect_category_display',
            'remedy_preference',
            'remedy_preference_display',
            'description',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'claim_number', 'status', 'created_at', 'updated_at']

