import os
import sys
import django
import asyncio

# Setup Django
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sales.sales.settings")
django.setup()

from sales.agent.company_mail_agent import send_grouped_company_outreach

async def main():
    print("Triggering Company-Wise Grouped Outreach...")
    print("============================================")
    
    try:
        # This function identifies all companies with 'approved' drafts,
        # combines them, and sends them to all company contacts.
        result = await asyncio.to_thread(send_grouped_company_outreach)
        
        if result.get("status") == "success":
            print(f"[OK] Success!")
            print(f"[STATS] Companies Processed: {result.get('companies_processed')}")
            print(f"[STATS] Emails Sent: {result.get('sent')}")
            print(f"[STATS] Emails Failed: {result.get('failed')}")
            
            if result.get("errors"):
                print("\n[WARNING] Errors encountered:")
                for err in result["errors"]:
                    print(f"   - {err.get('company_name')}: {err.get('error')}")
        else:
            print(f"[ERROR] Failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"[ERROR] Critical Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
