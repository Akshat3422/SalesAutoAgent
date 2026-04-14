from django.urls import path
from .views import (
    agent_trigger_view,
    pipeline_status_view,
    approval_queue_view,
    grouped_company_outreach_view,
    approve_outreach_view,
    skip_outreach_view,
    send_approved_outreach_view,
    send_grouped_company_outreach_view,
)

urlpatterns = [
    path('trigger/', agent_trigger_view, name='agent-trigger'),
    path('status/', pipeline_status_view, name='pipeline-status'),
    path('approvals/', approval_queue_view, name='approval-queue'),
    path('approvals/grouped-company/', grouped_company_outreach_view, name='grouped-company-outreach'),
    path('approvals/<int:outreach_id>/approve/', approve_outreach_view, name='approve-outreach'),
    path('approvals/<int:outreach_id>/skip/', skip_outreach_view, name='skip-outreach'),
    path('approvals/send-approved/', send_approved_outreach_view, name='send-approved-outreach'),
    path('approvals/send-grouped-company/', send_grouped_company_outreach_view, name='send-grouped-company-outreach'),
]
