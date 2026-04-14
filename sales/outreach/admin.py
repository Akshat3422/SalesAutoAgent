from django.contrib import admin
from .models import Outreach


@admin.register(Outreach)
class OutreachAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "contact", "status", "approved_at", "sent_at", "replied", "updated_at")
    search_fields = ("company__company_name", "contact__contact_email", "email_subject", "edited_subject")
    list_filter = ("status", "replied")
