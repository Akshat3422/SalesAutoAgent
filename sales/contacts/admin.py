from django.contrib import admin
from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("contact_name", "contact_role", "contact_email", "company", "created_at")
    search_fields = ("contact_email", "contact_name", "contact_role", "company__company_name", "company__domain")
