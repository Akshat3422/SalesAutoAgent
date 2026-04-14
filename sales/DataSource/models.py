from django.db import models

class DataSource(models.Model):
    URL = 'url'
    SITEMAP = 'sitemap'
    TYPE_CHOICES = [
        (URL, 'URL'),
        (SITEMAP, 'SiteMap'),
    ]

    domain = models.URLField(max_length=500, unique=True, null=True, blank=True) # E.g., https://example.com/
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=URL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"DataSource: {self.domain}"