from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Company
from .serializers import CompanySerializer
from sales.contacts.models import Contact
from sales.outreach.models import Outreach

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().prefetch_related('contacts')
    serializer_class = CompanySerializer

@api_view(['GET'])
def dashboard_stats_view(request):
    """
    Returns aggregate stats for the React/HTML dashboard.
    """
    total_companies = Company.objects.count()
    crawled_companies = Company.objects.filter(crawl_status='done').count()
    drafted = Outreach.objects.filter(status='drafted').count()
    approved = Outreach.objects.filter(status='approved').count()
    sent = Outreach.objects.filter(status='sent').count()
    replies = Outreach.objects.filter(replied=True).count()
    
    return Response({
        "leads_discovered": total_companies,
        "sites_crawled": crawled_companies,
        "emails_drafted": drafted,
        "emails_approved": approved,
        "emails_dispatched": sent,
        "replies_detected": replies,
    })
