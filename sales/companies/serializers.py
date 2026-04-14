from rest_framework import serializers
from .models import Company
from sales.contacts.serializers import ContactSerializer

class CompanySerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    
    class Meta:
        model = Company
        fields = '__all__'
