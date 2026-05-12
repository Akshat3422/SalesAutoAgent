import asyncio
import json
import threading
import requests
from collections import defaultdict
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from asgiref.sync import sync_to_async
from .graph import execute_pipeline
from sales.outreach.models import Outreach
from sales.contacts.models import Contact
from sales.campaigns.models import Campaign
from .email_sender import send_approved_outreach
from .company_mail_agent import send_grouped_company_outreach

# Tracking generic pipeline status
_PIPELINE_STATUS = {
    "is_running": False,
    "current_keyword": None,
    "campaign_id": None,
    "campaign_name": None,
    "started_at": None,
    "finished_at": None,
    "last_error": None,
}


_background_tasks = set()


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def agent_trigger_view(request):
    if request.method == "OPTIONS":
        return JsonResponse({"status": "ok"})

    if request.method == "POST":
        if _PIPELINE_STATUS["is_running"]:
            return JsonResponse(
                {
                    "error": "Pipeline already running",
                    "current_keyword": _PIPELINE_STATUS["current_keyword"],
                },
                status=409,
            )

        try:
            data = json.loads(request.body)
            keyword = data.get("keyword", "EdTech India AI")
            campaign_name = data.get("campaign_name", None)
            campaign_description = data.get("description") or data.get(
                "campaign_description"
            )
            campaign_id = data.get("campaign_id", None)
        except Exception:
            keyword = "EdTech India AI"
            campaign_name = None
            campaign_description = None
            campaign_id = None

        # Resolve campaign: use existing or create new
        campaign = None
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id, is_deleted=False)
            except Campaign.DoesNotExist:
                campaign = None

        if campaign is None and campaign_name:
            campaign, created = Campaign.objects.get_or_create(
                name=campaign_name,
                is_deleted=False,
                defaults={
                    "description": campaign_description
                    or f"Auto-created for keyword: {keyword}",
                    "is_active": True,
                },
            )
            if not created and campaign_description:
                campaign.description = campaign_description
                campaign.save(update_fields=["description", "updated_at"])
        elif campaign and campaign_description:
            campaign.description = campaign_description
            campaign.save(update_fields=["description", "updated_at"])

        resolved_campaign_id = campaign.id if campaign else None
        resolved_campaign_name = campaign.name if campaign else None
        resolved_campaign_description = (
            campaign.description if campaign else campaign_description
        )

        _PIPELINE_STATUS["is_running"] = True
        _PIPELINE_STATUS["current_keyword"] = keyword
        _PIPELINE_STATUS["campaign_id"] = resolved_campaign_id
        _PIPELINE_STATUS["campaign_name"] = resolved_campaign_name
        _PIPELINE_STATUS["started_at"] = timezone.now().isoformat()
        _PIPELINE_STATUS["finished_at"] = None
        _PIPELINE_STATUS["last_error"] = None

        def run_pipeline_background(kw, cid, desc):
            from django.db import connections

            connections.close_all()

            loop = None
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    execute_pipeline(kw, campaign_id=cid, campaign_description=desc)
                )
            except Exception as exc:
                _PIPELINE_STATUS["last_error"] = str(exc)
            finally:
                # Update campaign aggregate stats when pipeline finishes
                if cid:
                    try:
                        from sales.companies.models import Company
                        from sales.contacts.models import Contact
                        from sales.outreach.models import Outreach as OutreachModel

                        cpn = Campaign.objects.get(id=cid)
                        company_ids = list(
                            Company.objects.filter(campaign_id=cid).values_list(
                                "id", flat=True
                            )
                        )
                        cpn.total_companies_found = len(company_ids)
                        cpn.total_companies = len(company_ids)
                        cpn.email_extracted = Contact.objects.filter(
                            company_id__in=company_ids
                        ).count()
                        cpn.total_email_send = OutreachModel.objects.filter(
                            company_id__in=company_ids, status="sent"
                        ).count()
                        cpn.is_active = False
                        cpn.save(
                            update_fields=[
                                "total_companies_found",
                                "total_companies",
                                "email_extracted",
                                "total_email_send",
                                "is_active",
                                "updated_at",
                            ]
                        )
                    except Exception:
                        pass

                _PIPELINE_STATUS["is_running"] = False
                _PIPELINE_STATUS["current_keyword"] = None
                _PIPELINE_STATUS["campaign_id"] = None
                _PIPELINE_STATUS["campaign_name"] = None
                _PIPELINE_STATUS["finished_at"] = timezone.now().isoformat()
                try:
                    connections.close_all()
                except Exception:
                    pass
                if loop and not loop.is_closed():
                    loop.close()

        thread = threading.Thread(
            target=run_pipeline_background,
            args=(keyword, resolved_campaign_id, resolved_campaign_description),
            daemon=True,
        )
        thread.start()

        return JsonResponse(
            {
                "message": "Agent pipeline triggered successfully.",
                "keyword": keyword,
                "campaign_id": resolved_campaign_id,
                "campaign_name": resolved_campaign_name,
            },
            status=202,
        )

    # This line is only reached for non-POST, non-OPTIONS methods
    # but @require_http_methods already blocks those — kept for safety
    return JsonResponse({"error": "Only POST allowed"}, status=405)


def pipeline_status_view(request):
    """
    Returns the general status of the running pipeline.
    """
    if request.method == "GET":
        return JsonResponse(_PIPELINE_STATUS)
    return JsonResponse({"error": "Only GET allowed"}, status=405)


@csrf_exempt
def approval_queue_view(request):
    """
    GET: List all drafted emails waiting for approval.
    """
    if request.method == "GET":
        campaign_id = request.GET.get("campaign_id")
        drafts = Outreach.objects.filter(
            status="drafted", email_type="personalized"
        ).select_related("contact", "company")
        if campaign_id:
            drafts = drafts.filter(campaign_id=campaign_id)

        data = []
        for d in drafts:
            data.append(
                {
                    "id": d.id,
                    "company_name": d.company.company_name,
                    "industry": d.company.industry,
                    "ai_gaps": d.company.ai_gaps_detected,
                    "contact_name": d.contact.contact_name,
                    "contact_email": d.contact.contact_email,
                    "contact_role": d.contact.contact_role,
                    "subject": d.email_subject,
                    "body": d.email_body,
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
            )
        return JsonResponse({"status": "success", "data": data})

    return JsonResponse({"error": "Only GET allowed"}, status=405)


@csrf_exempt
def bulk_queue_view(request):
    """
    GET: List all BULK drafted emails grouped by campaign.
    """
    if request.method == "GET":
        campaign_id = request.GET.get("campaign_id")
        qs = Outreach.objects.filter(
            status="drafted", email_type="bulk"
        ).select_related("contact", "company")
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        data = []
        for d in qs:
            data.append(
                {
                    "id": d.id,
                    "company_id": d.company.id,
                    "company_name": d.company.company_name,
                    "company_domain": d.company.domain,
                    "contact_id": d.contact.id,
                    "contact_name": d.contact.contact_name,
                    "contact_email": d.contact.contact_email,
                    "contact_role": d.contact.contact_role,
                    "subject": d.email_subject,
                    "body": d.email_body,
                    "edited_subject": d.edited_subject,
                    "edited_body": d.edited_body,
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
            )
        return JsonResponse({"status": "success", "data": data})

    return JsonResponse({"error": "Only GET allowed"}, status=405)


@csrf_exempt
def grouped_company_outreach_view(request):
    """
    GET: Return approved outreach grouped by company for frontend coordination.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    campaign_id = request.GET.get("campaign_id")
    qs = Outreach.objects.filter(status="approved").select_related("company", "contact")
    if campaign_id:
        qs = qs.filter(campaign_id=campaign_id)

    approved_rows = list(qs.order_by("company_id", "created_at"))
    grouped = defaultdict(list)
    for outreach in approved_rows:
        grouped[outreach.company_id].append(outreach)

    data = []
    for company_id, rows in grouped.items():
        company = rows[0].company
        contacts = list(
            Contact.objects.filter(company_id=company_id, contact_email__isnull=False)
            .exclude(contact_email="")
            .order_by("created_at")
        )
        data.append(
            {
                "company_id": company_id,
                "company_name": company.company_name,
                "company_domain": company.domain,
                "draft_count": len(rows),
                "contact_count": len(contacts),
                "contacts": [
                    {
                        "id": contact.id,
                        "contact_name": contact.contact_name,
                        "contact_email": contact.contact_email,
                        "contact_role": contact.contact_role,
                    }
                    for contact in contacts
                ],
                "drafts": [
                    {
                        "id": row.id,
                        "contact_id": row.contact_id,
                        "contact_name": row.contact.contact_name,
                        "contact_email": row.contact.contact_email,
                        "subject": row.final_subject,
                        "body": row.final_body,
                        "status": row.status,
                    }
                    for row in rows
                ],
            }
        )

    return JsonResponse({"status": "success", "data": data})


@csrf_exempt
def approve_outreach_view(request, outreach_id):
    """
    POST: Approve an email and automatically send it via email_service.
    Optionally accept edits to subject and body.
    """
    if request.method == "POST":
        try:
            outreach = Outreach.objects.get(id=outreach_id, status="drafted")
        except Outreach.DoesNotExist:
            return JsonResponse(
                {"error": "Outreach draft not found or already processed"}, status=404
            )

        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            data = {}

        # Update subject/body if provided
        if "edited_subject" in data:
            outreach.edited_subject = data["edited_subject"]
        if "edited_body" in data:
            outreach.edited_body = data["edited_body"]

        # Mark as approved
        outreach.status = "approved"
        outreach.approved_at = timezone.now()
        outreach.save()

        # Get the email content
        subject = outreach.edited_subject or outreach.email_subject
        body = outreach.edited_body or outreach.email_body

        # Send email via email_service microservice
        def send_email_async():
            try:
                from sales.agent.email_sender import TEST_MODE, TEST_EMAIL

                to_email = TEST_EMAIL if TEST_MODE else outreach.contact.contact_email
                if TEST_MODE:
                    print(f"[TEST MODE] Redirecting email to {TEST_EMAIL}")

                email_service_url = "http://localhost:8001"
                response = requests.post(
                    f"{email_service_url}/api/send-email",
                    json={
                        "to_email": to_email,
                        "subject": subject,
                        "body": body,
                        "contact_name": outreach.contact.contact_name,
                        "company_name": outreach.company.company_name,
                    },
                    timeout=10,
                )

                if response.status_code in [200, 202]:
                    outreach.status = "sent"
                    outreach.sent_at = timezone.now()
                    outreach.save(update_fields=["status", "sent_at", "updated_at"])
                    print(f"✓ Email sent to {outreach.contact.contact_email}")
                else:
                    outreach.status = "approved"  # Stay approved, retry later
                    outreach.save(update_fields=["status", "updated_at"])
                    print(f"⚠ Email service returned {response.status_code}")
            except Exception as e:
                outreach.status = "approved"  # Stay approved, retry later
                outreach.save(update_fields=["status", "updated_at"])
                print(f"❌ Email send error: {str(e)}")

        # Send email in background thread
        thread = threading.Thread(target=send_email_async, daemon=True)
        thread.start()

        return JsonResponse(
            {
                "status": "success",
                "message": f"Outreach {outreach_id} approved. Email being sent...",
                "email_to": outreach.contact.contact_email,
            }
        )

    return JsonResponse({"error": "Only POST allowed"}, status=405)


@csrf_exempt
def edit_outreach_view(request, outreach_id):
    """
    PATCH: Edit subject and body of a drafted outreach email.
    """
    if request.method not in ["PATCH", "POST"]:
        return JsonResponse({"error": "Only PATCH or POST allowed"}, status=405)

    try:
        outreach = Outreach.objects.get(id=outreach_id, status="drafted")
    except Outreach.DoesNotExist:
        return JsonResponse({"error": "Outreach draft not found"}, status=404)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    if "edited_subject" in data:
        outreach.edited_subject = data["edited_subject"]
    if "edited_body" in data:
        outreach.edited_body = data["edited_body"]

    outreach.save(update_fields=["edited_subject", "edited_body", "updated_at"])

    return JsonResponse({"status": "success", "message": "Draft saved successfully"})


@csrf_exempt
def skip_outreach_view(request, outreach_id):
    """
    POST: Skip/Reject an email.
    """
    if request.method == "POST":
        try:
            outreach = Outreach.objects.get(id=outreach_id, status="drafted")
        except Outreach.DoesNotExist:
            return JsonResponse(
                {"error": "Outreach draft not found or already processed"}, status=404
            )

        outreach.status = "skipped"
        outreach.save()
        return JsonResponse(
            {"status": "success", "message": f"Outreach {outreach_id} skipped."}
        )

    return JsonResponse({"error": "Only POST allowed"}, status=405)


@csrf_exempt
def send_approved_outreach_view(request):
    """
    POST: Sends all approved outreach records that are not sent yet.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    approvals = Outreach.objects.filter(status="approved").select_related(
        "contact", "company"
    )
    sent = 0
    failed = 0
    errors = []

    for outreach in approvals:
        result = send_approved_outreach(outreach)
        if result.get("ok"):
            outreach.status = "sent"
            outreach.sent_at = timezone.now()
            outreach.sendgrid_message_id = result.get("message_id")
            outreach.save(
                update_fields=["status", "sent_at", "sendgrid_message_id", "updated_at"]
            )
            sent += 1
        else:
            outreach.status = "failed"
            outreach.save(update_fields=["status", "updated_at"])
            failed += 1
            errors.append(
                {
                    "outreach_id": outreach.id,
                    "contact_email": outreach.contact.contact_email,
                    "error": result.get("error", "unknown_error"),
                }
            )

    return JsonResponse(
        {
            "status": "success",
            "sent": sent,
            "failed": failed,
            "errors": errors,
        }
    )


@csrf_exempt
def send_grouped_company_outreach_view(request):
    """
    POST: Group approved outreach by company, combine into one email, and send to all company contacts.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    result = send_grouped_company_outreach()
    status_code = 200 if result.get("status") == "success" else 500
    return JsonResponse(result, status=status_code)


@csrf_exempt
def bulk_approve_company_view(request, company_id):
    """
    Deprecated. Use send_bulk_outreach_view instead.
    """
    return JsonResponse(
        {"error": "Deprecated. Use /api/agent/send-bulk/ instead."}, status=410
    )


@csrf_exempt
def send_bulk_outreach_view(request):
    """
    POST: Send all APPROVED emails across all companies (bulk sending).
    Executes asynchronously and returns immediately.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = {}

    email_service_url = data.get("email_service_url", "http://localhost:8001")

    # Get drafted bulk emails for the campaign
    campaign_id = data.get("campaign_id")
    if not campaign_id:
        return JsonResponse({"error": "campaign_id is required"}, status=400)

    drafted_emails = Outreach.objects.filter(
        status="drafted", email_type="bulk", campaign_id=campaign_id
    ).select_related("contact", "company")

    if not drafted_emails.exists():
        return JsonResponse(
            {
                "status": "info",
                "message": "No approved emails waiting to be sent.",
                "sent": 0,
                "failed": 0,
            }
        )

    def process_and_send():
        sent = 0
        failed = 0
        errors = []

        for outreach in drafted_emails:
            try:
                from sales.agent.email_sender import TEST_MODE, TEST_EMAIL

                to_email = TEST_EMAIL if TEST_MODE else outreach.contact.contact_email
                if TEST_MODE:
                    print(f"[TEST MODE] Redirecting email to {TEST_EMAIL}")

                response = requests.post(
                    f"{email_service_url}/api/send-email",
                    json={
                        "to_email": to_email,
                        "subject": outreach.edited_subject or outreach.email_subject,
                        "body": outreach.edited_body or outreach.email_body,
                        "contact_name": outreach.contact.contact_name,
                        "company_name": outreach.company.company_name,
                    },
                    timeout=10,
                )

                if response.status_code in [200, 202]:
                    outreach.status = "sent"
                    outreach.sent_at = timezone.now()
                    outreach.save(update_fields=["status", "sent_at", "updated_at"])
                    sent += 1

                    # Update Campaign stats if available
                    campaign = outreach.company.campaign
                    if campaign:
                        campaign.total_email_send = Outreach.objects.filter(
                            company__campaign=campaign, status="sent"
                        ).count()
                        campaign.save(update_fields=["total_email_send", "updated_at"])
                else:
                    failed += 1
                    errors.append(
                        {
                            "email": outreach.contact.contact_email,
                            "error": f"HTTP {response.status_code}",
                        }
                    )
            except Exception as e:
                failed += 1
                errors.append(
                    {"email": outreach.contact.contact_email, "error": str(e)}
                )

    # Send in background thread
    thread = threading.Thread(target=process_and_send, daemon=True)
    thread.start()

    return JsonResponse(
        {
            "status": "success",
            "message": f"Bulk sending {drafted_emails.count()} approved emails started.",
        }
    )
