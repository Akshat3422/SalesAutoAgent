from rest_framework import serializers
from .models import DataChunkProcess

class DataChunkProcessSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataChunkProcess
        fields = '__all__'
