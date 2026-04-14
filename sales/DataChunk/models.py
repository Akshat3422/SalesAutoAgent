from django.db import models

class DataChunkProcess(models.Model):
    PENDING = 'pending'
    PROCESSING = 'processing'
    READY = 'ready'
    ERROR = 'error'
    SKIPPED = 'skipped'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (READY, 'Ready'),
        (ERROR, 'Error'),
        (SKIPPED, 'Skipped'),
    ]
    
    STATUS_404_NOT_FOUND = '404'
    
    data_source = models.ForeignKey('DataSource.DataSource', on_delete=models.CASCADE, related_name='chunks')
    url = models.URLField(max_length=2000, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    error = models.TextField(blank=True, null=True)
    website_response_status = models.CharField(max_length=10, blank=True, null=True)
    result_data = models.JSONField(blank=True, null=True)
    sub_urls = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DataChunk {self.url} - {self.status}"
