import os
import sys
import django
import requests
import asyncio
from typing import Dict, Any
from asgiref.sync import sync_to_async

# Setup Django
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sales.sales.settings")
django.setup()

from sales.outreach.models import Outreach
from sales.companies.models import Company
from sales.contacts.models import Contact

async def check_microservice_health():
    print("\n[1] Checking Email Microservice Health...")
    url = os.getenv("EMAIL_MICROSERVICE_URL", "http://127.0.0.1:8001")
    try:
        # Use asyncio.to_thread for synchronous requests call
        response = await asyncio.to_thread(requests.get, f"{url}/api/health", timeout=5)
        if response.status_code == 200:
            print(f"[OK] Microservice is UP: {response.json()}")
        else:
            print(f"[ERROR] Microservice returned {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Could not connect to Microservice at {url}: {e}")

@sync_to_async
def get_stats():
    return {
        "companies": Company.objects.count(),
        "contacts": Contact.objects.count(),
        "drafts": Outreach.objects.filter(status='drafted').count(),
        "approved": Outreach.objects.filter(status='approved').count(),
        "sent": Outreach.objects.filter(status='sent').count(),
    }

async def check_database_stats():
    print("\n[2] Checking Database Stats...")
    try:
        stats = await get_stats()
        print(f"[STATS] Companies: {stats['companies']}")
        print(f"[STATS] Contacts: {stats['contacts']}")
        print(f"[STATS] Drafted Outreaches: {stats['drafts']}")
        print(f"[STATS] Approved Outreaches: {stats['approved']}")
        print(f"[STATS] Sent Outreaches: {stats['sent']}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch DB stats: {e}")

async def preview_company_wise_outreach():
    print("\n[3] Previewing Company-Wise Combined Emails (Logic Test)...")
    from sales.agent.company_mail_agent import _combine_company_drafts
    
    @sync_to_async
    def get_approved():
        return list(Outreach.objects.filter(status='approved').select_related('company', 'contact'))

    approved_drafts = await get_approved()
    
    if not approved_drafts:
        print("[INFO] No 'approved' drafts found. Please approve some drafts in the dashboard first to see a preview.")
        return

    # Group by company
    grouped = {}
    for d in approved_drafts:
        if d.company_id not in grouped:
            grouped[d.company_id] = []
        grouped[d.company_id].append(d)

    for company_id, rows in grouped.items():
        company = rows[0].company
        print(f"\n[COMPANY] Company: {company.company_name} ({company.domain})")
        print(f"[*] Combining {len(rows)} contact-specific drafts...")
        
        try:
            # _combine_company_drafts calls LLM and is sync, use to_thread
            combined = await asyncio.to_thread(_combine_company_drafts, company, rows)
            print(f"[EMAIL] Combined Subject: {combined['subject']}")
            print(f"[EMAIL] Combined Body Preview: {combined['body'][:200]}...")
            
            @sync_to_async
            def get_contact_count():
                return Contact.objects.filter(company=company, contact_email__isnull=False).count()
            
            count = await get_contact_count()
            print(f"[CONTACTS] This will be sent to {count} contacts.")
        except Exception as e:
            print(f"[ERROR] Error combining drafts: {e}")

async def main():
    print("SalesAuto Outreach Workflow Diagnostic Tool")
    print("==============================================")
    await check_microservice_health()
    await check_database_stats()
    await preview_company_wise_outreach()
    print("\n==============================================")
    print("Diagnostic complete.")

if __name__ == "__main__":
    asyncio.run(main())
