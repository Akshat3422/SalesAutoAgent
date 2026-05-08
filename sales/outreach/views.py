from rest_framework import viewsets
from .models import Outreach
from .serializers import OutreachSerializer


class OutreachViewSet(viewsets.ModelViewSet):
    queryset = Outreach.objects.all()
    serializer_class = OutreachSerializer

    def get_queryset(self):
        queryset = Outreach.objects.all()
        campaign_id = self.request.query_params.get("campaign")
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        return queryset
