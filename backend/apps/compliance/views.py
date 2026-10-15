import secrets
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import LegalNotice, WarrantyClaim
from .serializers import LegalNoticeSerializer, WarrantyClaimSerializer


class LegalNoticeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LegalNotice.objects.all()
    serializer_class = LegalNoticeSerializer
    lookup_field = 'notice_type'


class WarrantyClaimViewSet(viewsets.ModelViewSet):
    queryset = WarrantyClaim.objects.all().select_related('product')
    serializer_class = WarrantyClaimSerializer

    def list(self, request):
        """
        List claims for authenticated user or by email query param.
        """
        if request.user and request.user.is_authenticated:
            claims = WarrantyClaim.objects.filter(
                customer_email__iexact=request.user.email
            ).select_related('product').order_by('-created_at')
        else:
            email = request.query_params.get('email')
            order_id = request.query_params.get('order_id')
            if not email and not order_id:
                return Response(
                    {"error": "Authentifizierung, E-Mail-Filter oder Vorgangsnummer erforderlich."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            qs = WarrantyClaim.objects.all().select_related('product')
            if email:
                qs = qs.filter(customer_email__iexact=email.strip())
            if order_id:
                qs = qs.filter(order_id__iexact=order_id.strip())
            claims = qs.order_by('-created_at')

        serializer = self.get_serializer(claims, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        claim = WarrantyClaim.objects.filter(
            models.Q(id__iexact=pk) | models.Q(claim_number__iexact=pk)
        ).select_related('product').first()

        if not claim:
            return Response({"error": "Garantieantrag nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if claim.customer_email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email')
            if not email or email.strip().lower() != claim.customer_email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        return Response(self.get_serializer(claim).data)

    def perform_create(self, serializer):
        claim_number = f"WAR-DE-{secrets.token_hex(4).upper()}"
        serializer.save(claim_number=claim_number)

    @action(detail=False, methods=['get'])
    def track(self, request):
        claim_number = request.query_params.get('claim_number') or request.query_params.get('claim_id')
        email = request.query_params.get('email')

        if not claim_number:
            return Response({"error": "claim_number ist erforderlich."}, status=status.HTTP_400_BAD_REQUEST)

        qs = WarrantyClaim.objects.filter(claim_number__iexact=claim_number.strip()).select_related('product')
        if email:
            qs = qs.filter(customer_email__iexact=email.strip())

        claim = qs.first()
        if not claim:
            return Response(
                {"error": "Kein passender Garantieantrag unter diesen Angaben gefunden."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(self.get_serializer(claim).data)

