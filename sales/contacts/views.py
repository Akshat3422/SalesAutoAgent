from rest_framework import viewsets
from .models import Contact
from .serializers import ContactSerializer


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    def get_queryset(self):
        queryset = Contact.objects.all()
        campaign_id = self.request.query_params.get("campaign")
        if campaign_id:
            queryset = queryset.filter(company__campaign_id=campaign_id)
        return queryset
