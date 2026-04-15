from rest_framework import serializers
from .models import Company
from sales.contacts.serializers import ContactSerializer

class CompanySerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'domain', 'company_name', 'industry', 
            'ai_score', 'ai_score_reasoning',  # ← Include AI score
            'ai_gaps_detected', 'ai_recommendations',
            'services_offered', 'crawl_status', 
            'do_not_contact', 'created_at', 'updated_at',
            'contacts'
        ]
