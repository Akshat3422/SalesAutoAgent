import asyncio
import json
from collections import defaultdict
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
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
async def agent_trigger_view(request):
    """
    Endpoint to trigger the asynchronous agent pipeline.
    Expects passing a 'keyword' parameter.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            keyword = data.get('keyword', 'EdTech India AI')
        except:
            keyword = 'EdTech India AI'
            
        _PIPELINE_STATUS["is_running"] = True
        _PIPELINE_STATUS["current_keyword"] = keyword
        _PIPELINE_STATUS["started_at"] = timezone.now().isoformat()
        _PIPELINE_STATUS["finished_at"] = None
        _PIPELINE_STATUS["last_error"] = None

        async def run_and_clear():
            try:
                await execute_pipeline(keyword)
            except Exception as exc:
                _PIPELINE_STATUS["last_error"] = str(exc)
            finally:
                _PIPELINE_STATUS["is_running"] = False
                _PIPELINE_STATUS["current_keyword"] = None
                _PIPELINE_STATUS["finished_at"] = timezone.now().isoformat()

        # Fire and forget mechanism safely
        task = asyncio.create_task(run_and_clear())
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

        return JsonResponse(
            {"message": "Agent pipeline triggered successfully.", "keyword": keyword},
            status=202
        )
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
    POST: Approve an email. Optionally accept edits to subject and body.
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

        if "edited_subject" in data:
            outreach.edited_subject = data["edited_subject"]
        if "edited_body" in data:
            outreach.edited_body = data["edited_body"]

        send_now = bool(data.get("send_now", False))
        outreach.status = 'approved'
        outreach.approved_at = timezone.now()
        outreach.save()

        if send_now:
            send_result = send_approved_outreach(outreach)
            if send_result.get("ok"):
                outreach.status = 'sent'
                outreach.sent_at = timezone.now()
                outreach.sendgrid_message_id = send_result.get("message_id")
                outreach.save(update_fields=["status", "sent_at", "sendgrid_message_id", "updated_at"])
                return JsonResponse(
                    {"status": "success", "message": f"Outreach {outreach_id} approved and sent."}
                )

            outreach.status = 'failed'
            outreach.save(update_fields=["status", "updated_at"])
            return JsonResponse(
                {
                    "status": "error",
                    "message": f"Outreach {outreach_id} approved but send failed.",
                    "error": send_result.get("error", "unknown_error"),
                },
                status=502,
            )

        return JsonResponse({"status": "success", "message": f"Outreach {outreach_id} approved."})

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
