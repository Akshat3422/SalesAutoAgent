from rest_framework import viewsets
from .models import Campaign
from .serializers import CampaignSerializer


class CampaignViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Campaign.objects.filter(is_deleted=False).order_by(
        "-created_at"
    )
    serializer_class = CampaignSerializer
