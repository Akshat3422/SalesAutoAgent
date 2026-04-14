import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Email Microservice", version="1.0.0")

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 465))
SMTP_USER = os.getenv('SMTP_USER', os.getenv('GMAIL_ID'))
SMTP_PASS = os.getenv('SMTP_PASS', os.getenv('PASSWORD'))
FROM_EMAIL = os.getenv('FROM_EMAIL', SMTP_USER)

if not SMTP_USER or not SMTP_PASS:
    print("WARNING: SMTP_USER or SMTP_PASS is not set. Emails will not actually be sent.")


class EmailPayload(BaseModel):
    to_email: EmailStr
    subject: str
    body: str

class BulkEmailPayload(BaseModel):
    emails: List[EmailPayload]


def send_email_via_smtp(to_email: str, subject: str, body: str):
    if not SMTP_USER or not SMTP_PASS:
        print(f"[Mock Send] To: {to_email} | Subject: {subject} | Body: {len(body)} chars")
        return {"status": "mocked", "message": "SMTP credentials missing, email mocked"}

    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    
    # Add List-Unsubscribe header for compliance
    unsubscribe_email = f"unsubscribe@{FROM_EMAIL.split('@')[-1]}" if FROM_EMAIL else "unsubscribe@example.com"
    msg.add_header("List-Unsubscribe", f"<mailto:{unsubscribe_email}>")

    html_content = body.replace('\n', '<br>')
    part = MIMEText(html_content, 'html')
    msg.attach(part)

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            
        return {
            "status": "success", 
            "status_code": 200, 
            "message_id": msg.get("Message-ID", "unknown")
        }
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/send-email")
async def send_email(payload: EmailPayload, background_tasks: BackgroundTasks):
    """
    Send a single customized email via SMTP. 
    Can be run asynchronously via background tasks.
    """
    try:
        result = send_email_via_smtp(
            payload.to_email,
            payload.subject,
            payload.body
        )
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        return {"message": "Email sent successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/send-bulk")
async def send_bulk_emails(payload: BulkEmailPayload, background_tasks: BackgroundTasks):
    """
    Send a batch of approved emails via SMTP.
    """
    results = []
    for email in payload.emails:
        res = send_email_via_smtp(email.to_email, email.subject, email.body)
        results.append({"to": email.to_email, "result": res})
        
    return {"message": f"Processed {len(payload.emails)} emails.", "results": results}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Email Microservice", "provider": "SMTP"}
