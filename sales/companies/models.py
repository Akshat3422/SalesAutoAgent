from django.db import models


class Company(models.Model):
    CRAWL_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("crawling", "Crawling"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    domain = models.CharField(max_length=255, unique=True)
    company_name = models.CharField(
        max_length=255, unique=True, blank=False, null=False
    )
    industry = models.CharField(max_length=255, blank=True, null=True)
    ai_score = models.IntegerField(default=0, help_text="0-100 score")
    ai_score_reasoning = models.TextField(
        blank=True, null=True, help_text="LLM explanation for the AI score"
    )
    ai_gaps_detected = models.TextField(blank=True, null=True)
    ai_recommendations = models.TextField(
        blank=True, null=True, help_text="Recommended AI services"
    )
    services_offered = models.TextField(
        blank=True, null=True, help_text="Services scraped from website"
    )
    crawl_status = models.CharField(
        max_length=20, choices=CRAWL_STATUS_CHOICES, default="pending"
    )
    mongo_doc_id = models.CharField(max_length=255, blank=True, null=True)
    do_not_contact = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "companies"

    def __str__(self):
        return self.company_name or self.domain
