from django.db import models


class Outreach(models.Model):
    STATUS_CHOICES = [
        ('drafted', 'Drafted'),
        ('approved', 'Approved'),
        ('sent', 'Sent'),
        ('skipped', 'Skipped'),
        ('replied', 'Replied'),
        ('failed', 'Failed'),
    ]

    contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='outreaches')
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='outreaches')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='drafted')
    email_subject = models.CharField(max_length=500, blank=True, null=True)
    email_body = models.TextField(blank=True, null=True)
    edited_subject = models.CharField(max_length=500, blank=True, null=True, help_text="Human-edited subject")
    edited_body = models.TextField(blank=True, null=True, help_text="Human-edited body")
    sent_at = models.DateTimeField(blank=True, null=True)
    replied = models.BooleanField(default=False)
    reply_content = models.TextField(blank=True, null=True)
    reply_detected_at = models.DateTimeField(blank=True, null=True)
    follow_up_count = models.IntegerField(default=0)
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.CharField(max_length=255, blank=True, null=True)
    sendgrid_message_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "outreach records"
        constraints = [
            models.UniqueConstraint(fields=["company", "contact"], name="uniq_outreach_company_contact")
        ]

    def __str__(self):
        return f"Outreach to {self.contact} - {self.status}"

    @property
    def final_subject(self):
        """Return user-edited subject if available, else the AI-generated one."""
        return self.edited_subject or self.email_subject

    @property
    def final_body(self):
        """Return user-edited body if available, else the AI-generated one."""
        return self.edited_body or self.email_body
