from django.db import models


class Campaign(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    total_companies_found = models.PositiveIntegerField(default=0)
    email_extracted = models.PositiveIntegerField(default=0)
    total_email_send = models.PositiveIntegerField(default=0)
    total_companies = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("name", "is_deleted")
