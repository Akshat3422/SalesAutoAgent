from rest_framework import serializers
from .models import Campaign


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "description",
            "total_companies_found",
            "email_extracted",
            "total_email_send",
            "total_companies",
            "created_at",
            "updated_at",
            "is_active",
            "is_deleted",
        ]
