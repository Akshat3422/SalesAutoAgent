import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Email Microservice",
    version="1.0.0",
    description="FastAPI microservice for sending emails via SMTP",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 465))
SMTP_USER = os.getenv('SMTP_USER', os.getenv('GMAIL_ID'))
SMTP_PASS = os.getenv('SMTP_PASS', os.getenv('PASSWORD'))
FROM_EMAIL = os.getenv('FROM_EMAIL', SMTP_USER)

if not SMTP_USER or not SMTP_PASS:
    print("WARNING: SMTP_USER or SMTP_PASS is not set. Emails will not actually be sent.")


# Models
class EmailPayload(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "recipient@example.com",
                "subject": "Test Email",
                "body": "This is a test email"
            }
        }


class BulkEmailPayload(BaseModel):
    emails: List[EmailPayload]
    
    class Config:
        json_schema_extra = {
            "example": {
                "emails": [
                    {
                        "to_email": "user1@example.com",
                        "subject": "Test 1",
                        "body": "Body 1"
                    },
                    {
                        "to_email": "user2@example.com",
                        "subject": "Test 2",
                        "body": "Body 2"
                    }
                ]
            }
        }


# Root endpoint
@app.get("/", tags=["Info"])
def root():
    """
    Welcome to Email Microservice API.
    
    Access documentation at:
    - Swagger UI: http://localhost:8001/docs
    - ReDoc: http://localhost:8001/redoc
    - OpenAPI Schema: http://localhost:8001/openapi.json
    """
    return {
        "message": "Email Microservice API",
        "version": "1.0.0",
        "docs": "http://localhost:8001/docs",
        "redoc": "http://localhost:8001/redoc",
        "health": "http://localhost:8001/api/health"
    }


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


@app.post("/api/send-email", tags=["Email"])
async def send_email(payload: EmailPayload, background_tasks: BackgroundTasks):
    """
    Send a single email via SMTP.
    
    **Parameters:**
    - `to_email`: Recipient email address (must be valid)
    - `subject`: Email subject line
    - `body`: Email body content (will be converted to HTML)
    
    **Returns:**
    - 200: Email sent successfully
    - 500: Error sending email (check credentials)
    
    **Example Request:**
    ```json
    {
        "to_email": "user@example.com",
        "subject": "Sales Outreach",
        "body": "Hi, interested in our AI solution?"
    }
    ```
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


@app.post("/api/send-bulk", tags=["Email"])
async def send_bulk_emails(payload: BulkEmailPayload, background_tasks: BackgroundTasks):
    """
    Send multiple emails in batch via SMTP.
    
    **Parameters:**
    - `emails`: List of email objects, each containing:
      - `to_email`: Recipient email address
      - `subject`: Email subject
      - `body`: Email body
    
    **Returns:**
    - List of results for each email sent
    
    **Example Request:**
    ```json
    {
        "emails": [
            {
                "to_email": "user1@example.com",
                "subject": "Subject 1",
                "body": "Body 1"
            },
            {
                "to_email": "user2@example.com",
                "subject": "Subject 2",
                "body": "Body 2"
            }
        ]
    }
    ```
    """
    results = []
    for email in payload.emails:
        res = send_email_via_smtp(email.to_email, email.subject, email.body)
        results.append({"to": email.to_email, "result": res})
        
    return {"message": f"Processed {len(payload.emails)} emails.", "results": results}


@app.get("/api/health", tags=["Status"])
def health_check():
    """
    Health check endpoint to verify the service is running.
    
    **Returns:**
    - Status: "ok" if service is healthy
    - Service name: "Email Microservice"
    - Provider: "SMTP"
    """
    return {"status": "ok", "service": "Email Microservice", "provider": "SMTP"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EMAIL_SERVICE_PORT", 8001))
    print("\n" + "="*60)
    print("📧 Email Microservice Starting...")
    print("="*60)
    print(f"🎯 Service Port: {port}")
    print(f"🌐 Host: 0.0.0.0")
    print("\n📚 Documentation URLs:")
    print(f"   • Swagger UI:  http://localhost:{port}/docs")
    print(f"   • ReDoc:       http://localhost:{port}/redoc")
    print(f"   • OpenAPI:     http://localhost:{port}/openapi.json")
    print(f"\n🔌 API Endpoints:")
    print(f"   • Root:        http://localhost:{port}/")
    print(f"   • Health:      http://localhost:{port}/api/health")
    print(f"   • Send Email:  POST http://localhost:{port}/api/send-email")
    print(f"   • Send Bulk:   POST http://localhost:{port}/api/send-bulk")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
