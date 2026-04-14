from django.db import models


class Contact(models.Model):
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='contacts')
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(unique=True, blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    contact_role = models.CharField(max_length=255, blank=True, null=True)
    linkedin_url = models.URLField(max_length=500, blank=True, null=True)
    source_page = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.contact_name or self.contact_email
