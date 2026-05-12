from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

from sales.companies.views import CompanyViewSet, dashboard_stats_view
from sales.contacts.views import ContactViewSet
from sales.outreach.views import OutreachViewSet
from sales.DataSource.views import DataSourceViewSet
from sales.DataChunk.views import DataChunkProcessViewSet
from sales.campaigns.views import CampaignViewSet
from sales.sales.auth_views import login_view, logout_view, user_view


# Root health check
def health_check(request):
    return JsonResponse({"status": "ok", "message": "SalesAuto API is running"})


router = DefaultRouter()
router.register(r"companies", CompanyViewSet)
router.register(r"contacts", ContactViewSet)
router.register(r"outreach", OutreachViewSet)
router.register(r"datasource", DataSourceViewSet)
router.register(r"datachunk", DataChunkProcessViewSet)
router.register(r"campaigns", CampaignViewSet)

urlpatterns = [
    path("", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path("api/auth/login/", login_view, name="api-login"),
    path("api/auth/logout/", logout_view, name="api-logout"),
    path("api/auth/user/", user_view, name="api-user"),
    path("api/", include(router.urls)),
    path("api/dashboard/stats/", dashboard_stats_view, name="dashboard-stats"),
    path("api/agent/", include("sales.agent.urls")),
]
