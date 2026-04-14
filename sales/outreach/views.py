from rest_framework import viewsets
from .models import Outreach
from .serializers import OutreachSerializer

class OutreachViewSet(viewsets.ModelViewSet):
    queryset = Outreach.objects.all()
    serializer_class = OutreachSerializer
