from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List

from django.utils import timezone

from sales.contacts.models import Contact
from sales.outreach.models import Outreach
from sales.agent.email_sender import send_email_payload
from sales.agent.graph import call_llm, safe_parse_llm_json
from sales.agent.prompts import COMBINE_COMPANY_OUTREACH_PROMPT


def _combine_company_drafts(company, outreach_rows: List[Outreach]) -> Dict[str, str]:
    drafts = []
    for idx, outreach in enumerate(outreach_rows, start=1):
        drafts.append(
            f"Draft {idx}\n"
            f"Subject: {outreach.final_subject or ''}\n"
            f"Body:\n{outreach.final_body or ''}"
        )

    prompt = COMBINE_COMPANY_OUTREACH_PROMPT.format(
        company_name=company.company_name,
        industry=company.industry or "Unknown",
        domain=company.domain,
        drafts="\n\n".join(drafts)[:12000],
    )
    parsed = safe_parse_llm_json(call_llm(prompt, temperature=0.2), context=f"combine_outreach/{company.id}") or {}
    subject = str(parsed.get("subject") or "").strip()
    body = str(parsed.get("body") or "").strip()

    if subject and body:
        return {"subject": subject[:500], "body": body}

    first = outreach_rows[0]
    return {
        "subject": (first.final_subject or "Quick idea")[:500],
        "body": first.final_body or "",
    }


def send_grouped_company_outreach() -> Dict[str, Any]:
    approved_rows = list(
        Outreach.objects.filter(status="approved")
        .select_related("company", "contact")
        .order_by("company_id", "created_at")
    )

    grouped: Dict[int, List[Outreach]] = defaultdict(list)
    for outreach in approved_rows:
        grouped[outreach.company_id].append(outreach)

    sent = 0
    failed = 0
    companies_processed = 0
    errors: List[Dict[str, Any]] = []

    for company_id, company_outreach in grouped.items():
        company = company_outreach[0].company
        company_sent = 0
        company_failed = 0
        contacts = list(
            Contact.objects.filter(company_id=company_id, contact_email__isnull=False)
            .exclude(contact_email="")
            .order_by("created_at")
        )
        if not contacts:
            errors.append({
                "company_id": company_id,
                "company_name": company.company_name,
                "error": "no_contacts_with_email",
            })
            continue

        combined = _combine_company_drafts(company, company_outreach)
        companies_processed += 1

        for contact in contacts:
            outreach, _ = Outreach.objects.get_or_create(
                company=company,
                contact=contact,
                defaults={
                    "status": "approved",
                    "edited_subject": combined["subject"],
                    "edited_body": combined["body"],
                    "approved_at": timezone.now(),
                },
            )

            outreach.edited_subject = combined["subject"]
            outreach.edited_body = combined["body"]
            if outreach.status == "drafted":
                outreach.status = "approved"
            if outreach.approved_at is None:
                outreach.approved_at = timezone.now()
            outreach.save(update_fields=["edited_subject", "edited_body", "status", "approved_at", "updated_at"])

            if outreach.status == "sent":
                continue

            result = send_email_payload(
                to_email=contact.contact_email,
                subject=combined["subject"],
                body=combined["body"],
            )
            if result.get("ok"):
                outreach.status = "sent"
                outreach.sent_at = timezone.now()
                outreach.sendgrid_message_id = result.get("message_id")
                outreach.save(update_fields=["status", "sent_at", "sendgrid_message_id", "updated_at"])
                sent += 1
                company_sent += 1
            else:
                outreach.status = "failed"
                outreach.save(update_fields=["status", "updated_at"])
                failed += 1
                company_failed += 1
                errors.append({
                    "company_id": company_id,
                    "company_name": company.company_name,
                    "contact_email": contact.contact_email,
                    "error": result.get("error", "unknown_error"),
                })

        for source_outreach in company_outreach:
            source_outreach.edited_subject = combined["subject"]
            source_outreach.edited_body = combined["body"]
            if company_sent > 0 and company_failed == 0:
                source_outreach.status = "sent"
                source_outreach.sent_at = timezone.now()
                source_outreach.save(update_fields=["edited_subject", "edited_body", "status", "sent_at", "updated_at"])
            else:
                source_outreach.save(update_fields=["edited_subject", "edited_body", "updated_at"])

    return {
        "status": "success",
        "companies_processed": companies_processed,
        "sent": sent,
        "failed": failed,
        "errors": errors,
    }
