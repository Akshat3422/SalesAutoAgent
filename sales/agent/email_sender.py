import os
from typing import Dict, Any

import requests
from django.conf import settings


def send_email_payload(to_email: str, subject: str, body: str) -> Dict[str, Any]:
    base_url = getattr(settings, "EMAIL_MICROSERVICE_URL", os.getenv("EMAIL_MICROSERVICE_URL", "http://127.0.0.1:8001"))
    endpoint = f"{base_url.rstrip('/')}/api/send-email"
    payload = {
        "to_email": to_email,
        "subject": subject,
        "body": body,
    }
    timeout = int(getattr(settings, "EMAIL_MICROSERVICE_TIMEOUT_SECONDS", 15))

    try:
        response = requests.post(endpoint, json=payload, timeout=timeout)
        response.raise_for_status()
        body = response.json()
        result = body.get("result", {}) if isinstance(body, dict) else {}
        return {
            "ok": True,
            "provider_status": result.get("status"),
            "provider_code": result.get("status_code"),
            "message_id": result.get("message_id"),
            "raw": body,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def send_approved_outreach(outreach) -> Dict[str, Any]:
    return send_email_payload(
        to_email=outreach.contact.contact_email,
        subject=outreach.final_subject,
        body=outreach.final_body,
    )
