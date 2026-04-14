from rest_framework import viewsets
from .models import DataChunkProcess
from .serializers import DataChunkProcessSerializer

class DataChunkProcessViewSet(viewsets.ModelViewSet):
    queryset = DataChunkProcess.objects.all()
    serializer_class = DataChunkProcessSerializer
