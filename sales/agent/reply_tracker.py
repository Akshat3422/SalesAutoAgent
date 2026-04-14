import os
import django
from django.utils import timezone
from imap_tools import MailBox, AND
from dotenv import load_dotenv

import sys
from pathlib import Path

# Setup Django if run as standalone script
if not django.apps.apps.ready:
    BASE_DIR = Path(__file__).resolve().parent.parent.parent  # SalesAuto/
    sys.path.insert(0, str(BASE_DIR))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sales.sales.settings')
    django.setup()

from sales.outreach.models import Outreach
from sales.contacts.models import Contact

load_dotenv()

IMAP_HOST = os.getenv("IMAP_HOST", "imap.gmail.com")
IMAP_USER = os.getenv("IMAP_USER", os.getenv("GMAIL_ID", ""))
IMAP_PASS = os.getenv("IMAP_PASS", os.getenv("PASSWORD", ""))


def poll_replies():
    """
    Connects to the inbox via IMAP and searches for replies to our outreach.
    Updates Outreach records in the database if a reply is detected.
    """
    if not IMAP_USER or not IMAP_PASS:
        print("IMAP credentials not set. Cannot poll replies.")
        return {"status": "error", "message": "Credentials missing"}
        
    print(f"Connecting to {IMAP_HOST} as {IMAP_USER}...")
    
    replies_found = 0
    try:
        with MailBox(IMAP_HOST).login(IMAP_USER, IMAP_PASS) as mailbox:
            # Poll all sent outreach records that haven't received a reply yet
            pending_outreach = Outreach.objects.filter(status='sent', replied=False).select_related('contact')
            
            for outreach in pending_outreach:
                contact_email = outreach.contact.contact_email
                subject = outreach.email_subject or outreach.edited_subject
                
                # We can search by From address and subject
                # Many replies will have "Re: " + our subject
                # For simplicity, we search emails from the contact
                
                messages = mailbox.fetch(AND(from_=contact_email), limit=5, reverse=True)
                
                for msg in messages:
                    # simplistic check: if they sent us an email after we sent ours, count it as a reply
                    if outreach.sent_at and msg.date.replace(tzinfo=None) > outreach.sent_at.replace(tzinfo=None):
                        print(f"--> Reply detected from {contact_email}!")
                        outreach.replied = True
                        outreach.reply_content = msg.text or msg.html
                        outreach.status = 'replied'
                        outreach.reply_detected_at = timezone.now()
                        outreach.save()
                        replies_found += 1
                        break

    except Exception as e:
        print(f"Error polling IMAP: {e}")
        return {"status": "error", "message": str(e)}

    print(f"Poll completed. {replies_found} new replies detected.")
    return {"status": "success", "replies_found": replies_found}

if __name__ == "__main__":
    poll_replies()
