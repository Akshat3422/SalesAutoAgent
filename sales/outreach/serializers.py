from rest_framework import serializers
from .models import Outreach

class OutreachSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_domain = serializers.CharField(source='company.domain', read_only=True)
    contact_name = serializers.CharField(source='contact.contact_name', read_only=True)
    contact_email = serializers.CharField(source='contact.contact_email', read_only=True)
    contact_role = serializers.CharField(source='contact.contact_role', read_only=True)
    subject = serializers.CharField(source='final_subject', read_only=True)
    body = serializers.CharField(source='final_body', read_only=True)

    class Meta:
        model = Outreach
        fields = '__all__'
