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
from .email_sender import send_approved_outreach
from .company_mail_agent import send_grouped_company_outreach

# Tracking generic pipeline status
_PIPELINE_STATUS = {
    "is_running": False,
    "current_keyword": None,
    "started_at": None,
    "finished_at": None,
    "last_error": None,
}


_background_tasks = set()

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def agent_trigger_view(request):
    if request.method == 'OPTIONS':
        return JsonResponse({"status": "ok"})
    
    if request.method == 'POST':
        if _PIPELINE_STATUS["is_running"]:
            return JsonResponse(
                {"error": "Pipeline already running", "current_keyword": _PIPELINE_STATUS["current_keyword"]},
                status=409
            )
        
        try:
            data = json.loads(request.body)
            keyword = data.get('keyword', 'EdTech India AI')
        except Exception:
            keyword = 'EdTech India AI'
            
        _PIPELINE_STATUS["is_running"] = True
        _PIPELINE_STATUS["current_keyword"] = keyword
        _PIPELINE_STATUS["started_at"] = timezone.now().isoformat()
        _PIPELINE_STATUS["finished_at"] = None
        _PIPELINE_STATUS["last_error"] = None

        def run_pipeline_background():
            from django.db import connections
            connections.close_all()
            
            loop = None
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(execute_pipeline(keyword))
            except Exception as exc:
                _PIPELINE_STATUS["last_error"] = str(exc)
            finally:
                _PIPELINE_STATUS["is_running"] = False
                _PIPELINE_STATUS["current_keyword"] = None
                _PIPELINE_STATUS["finished_at"] = timezone.now().isoformat()
                try:
                    connections.close_all()
                except Exception:
                    pass
                if loop and not loop.is_closed():
                    loop.close()
        # ✅ FIXED: thread.start() and return are OUTSIDE the finally block
        #    and INSIDE the `if request.method == 'POST':` block
        thread = threading.Thread(target=run_pipeline_background, daemon=True)
        thread.start()

        return JsonResponse(
            {"message": "Agent pipeline triggered successfully.", "keyword": keyword},
            status=202
        )

    # This line is only reached for non-POST, non-OPTIONS methods
    # but @require_http_methods already blocks those — kept for safety
    return JsonResponse({"error": "Only POST allowed"}, status=405)


def pipeline_status_view(request):
    """
    Returns the general status of the running pipeline.
    """
    if request.method == 'GET':
        return JsonResponse(_PIPELINE_STATUS)
    return JsonResponse({"error": "Only GET allowed"}, status=405)


@csrf_exempt
def approval_queue_view(request):
    """
    GET: List all drafted emails waiting for approval.
    """
    if request.method == 'GET':
        drafts = Outreach.objects.filter(status='drafted').select_related('contact', 'company')
        data = []
        for d in drafts:
            data.append({
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
            })
        return JsonResponse({"status": "success", "data": data})

    return JsonResponse({"error": "Only GET allowed"}, status=405)


@csrf_exempt
def grouped_company_outreach_view(request):
    """
    GET: Return approved outreach grouped by company for frontend coordination.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    approved_rows = list(
        Outreach.objects.filter(status='approved')
        .select_related('company', 'contact')
        .order_by('company_id', 'created_at')
    )
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
        data.append({
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
        })

    return JsonResponse({"status": "success", "data": data})


@csrf_exempt
def approve_outreach_view(request, outreach_id):
    """
    POST: Approve an email and automatically send it via email_service.
    Optionally accept edits to subject and body.
    """
    if request.method == 'POST':
        try:
            outreach = Outreach.objects.get(id=outreach_id, status='drafted')
        except Outreach.DoesNotExist:
            return JsonResponse({"error": "Outreach draft not found or already processed"}, status=404)

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
        outreach.status = 'approved'
        outreach.approved_at = timezone.now()
        outreach.save()

        # Get the email content
        subject = outreach.edited_subject or outreach.email_subject
        body = outreach.edited_body or outreach.email_body

        # Send email via email_service microservice
        def send_email_async():
            try:
                email_service_url = "http://localhost:8001"
                response = requests.post(
                    f"{email_service_url}/api/send-email",
                    json={
                        "to_email": outreach.contact.contact_email,
                        "subject": subject,
                        "body": body,
                        "contact_name": outreach.contact.contact_name,
                        "company_name": outreach.company.company_name,
                    },
                    timeout=10
                )
                
                if response.status_code in [200, 202]:
                    outreach.status = 'sent'
                    outreach.sent_at = timezone.now()
                    outreach.save(update_fields=["status", "sent_at", "updated_at"])
                    print(f"✓ Email sent to {outreach.contact.contact_email}")
                else:
                    outreach.status = 'approved'  # Stay approved, retry later
                    outreach.save(update_fields=["status", "updated_at"])
                    print(f"⚠ Email service returned {response.status_code}")
            except Exception as e:
                outreach.status = 'approved'  # Stay approved, retry later
                outreach.save(update_fields=["status", "updated_at"])
                print(f"❌ Email send error: {str(e)}")

        # Send email in background thread
        thread = threading.Thread(target=send_email_async, daemon=True)
        thread.start()

        return JsonResponse({
            "status": "success", 
            "message": f"Outreach {outreach_id} approved. Email being sent...",
            "email_to": outreach.contact.contact_email
        })

    return JsonResponse({"error": "Only POST allowed"}, status=405)


@csrf_exempt
def skip_outreach_view(request, outreach_id):
    """
    POST: Skip/Reject an email.
    """
    if request.method == 'POST':
        try:
            outreach = Outreach.objects.get(id=outreach_id, status='drafted')
        except Outreach.DoesNotExist:
            return JsonResponse({"error": "Outreach draft not found or already processed"}, status=404)

        outreach.status = 'skipped'
        outreach.save()
        return JsonResponse({"status": "success", "message": f"Outreach {outreach_id} skipped."})

    return JsonResponse({"error": "Only POST allowed"}, status=405)


@csrf_exempt
def send_approved_outreach_view(request):
    """
    POST: Sends all approved outreach records that are not sent yet.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    approvals = Outreach.objects.filter(status='approved').select_related('contact', 'company')
    sent = 0
    failed = 0
    errors = []

    for outreach in approvals:
        result = send_approved_outreach(outreach)
        if result.get("ok"):
            outreach.status = 'sent'
            outreach.sent_at = timezone.now()
            outreach.sendgrid_message_id = result.get("message_id")
            outreach.save(update_fields=["status", "sent_at", "sendgrid_message_id", "updated_at"])
            sent += 1
        else:
            outreach.status = 'failed'
            outreach.save(update_fields=["status", "updated_at"])
            failed += 1
            errors.append({
                "outreach_id": outreach.id,
                "contact_email": outreach.contact.contact_email,
                "error": result.get("error", "unknown_error"),
            })

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
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    result = send_grouped_company_outreach()
    status_code = 200 if result.get("status") == "success" else 500
    return JsonResponse(result, status=status_code)


@csrf_exempt
def bulk_approve_company_view(request, company_id):
    """
    POST: Approve and send ALL drafted emails for a specific company.
    Body can contain:
    {
      "email_service_url": "http://localhost:8001"  (optional)
    }
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return JsonResponse({"error": "Company not found"}, status=404)

    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = {}

    email_service_url = data.get("email_service_url", "http://localhost:8001")

    # Get all drafted emails for this company
    drafts = Outreach.objects.filter(
        company_id=company_id,
        status='drafted'
    ).select_related('contact')

    if not drafts.exists():
        return JsonResponse({
            "status": "info",
            "message": f"No drafted emails for {company.company_name}",
            "sent": 0,
            "failed": 0
        })

    def send_bulk_async():
        sent = 0
        failed = 0
        errors = []

        for outreach in drafts:
            # Approve the outreach
            outreach.status = 'approved'
            outreach.approved_at = timezone.now()
            outreach.save()

            # Send email
            try:
                response = requests.post(
                    f"{email_service_url}/api/send-email",
                    json={
                        "to_email": outreach.contact.contact_email,
                        "subject": outreach.edited_subject or outreach.email_subject,
                        "body": outreach.edited_body or outreach.email_body,
                        "contact_name": outreach.contact.contact_name,
                        "company_name": outreach.company.company_name,
                    },
                    timeout=10
                )

                if response.status_code in [200, 202]:
                    outreach.status = 'sent'
                    outreach.sent_at = timezone.now()
                    outreach.save(update_fields=["status", "sent_at", "updated_at"])
                    sent += 1
                    print(f"✓ Email sent to {outreach.contact.contact_email}")
                else:
                    outreach.status = 'approved'
                    outreach.save(update_fields=["status", "updated_at"])
                    failed += 1
                    errors.append({
                        "email": outreach.contact.contact_email,
                        "error": f"HTTP {response.status_code}"
                    })
                    print(f"⚠ Email send failed: {response.status_code}")
            except Exception as e:
                outreach.status = 'approved'
                outreach.save(update_fields=["status", "updated_at"])
                failed += 1
                errors.append({
                    "email": outreach.contact.contact_email,
                    "error": str(e)
                })
                print(f"❌ Error sending to {outreach.contact.contact_email}: {str(e)}")

    # Send in background thread
    thread = threading.Thread(target=send_bulk_async, daemon=True)
    thread.start()

    return JsonResponse({
        "status": "success",
        "message": f"Bulk sending {len(list(drafts))} emails for {company.company_name}...",
        "company_id": company_id,
        "company_name": company.company_name
    }, status=202)
