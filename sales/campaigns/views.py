from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Campaign
from .serializers import CampaignSerializer
from sales.outreach.models import Outreach


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.filter(is_deleted=False).order_by("-created_at")
    serializer_class = CampaignSerializer

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        """
        GET /api/campaigns/{id}/stats/
        Returns computed stats for this campaign.
        """
        campaign = self.get_object()

        # Company stats
        companies_qs = campaign.companies.all()
        total_companies = companies_qs.count()
        crawled_companies = companies_qs.filter(crawl_status="done").count()
        failed_companies = companies_qs.filter(crawl_status="failed").count()

        # Contact stats (through companies)
        from sales.contacts.models import Contact
        company_ids = list(companies_qs.values_list("id", flat=True))
        total_contacts = Contact.objects.filter(company_id__in=company_ids).count()

        # Outreach stats
        outreach_qs = Outreach.objects.filter(company_id__in=company_ids)
        drafted = outreach_qs.filter(status="drafted").count()
        approved = outreach_qs.filter(status="approved").count()
        sent = outreach_qs.filter(status="sent").count()
        replies = outreach_qs.filter(replied=True).count()

        return Response({
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "total_companies": total_companies,
            "crawled_companies": crawled_companies,
            "failed_companies": failed_companies,
            "total_contacts": total_contacts,
            "emails_drafted": drafted,
            "emails_approved": approved,
            "emails_sent": sent,
            "replies": replies,
        })
