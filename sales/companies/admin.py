from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("company_name", "domain", "industry", "ai_score", "crawl_status", "do_not_contact", "updated_at")
    search_fields = ("company_name", "domain", "industry")
    list_filter = ("crawl_status", "do_not_contact", "industry")
