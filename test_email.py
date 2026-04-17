import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sales.sales.settings")  # adjust if needed
django.setup()



TEST_MODE = True




    # existing SMTP logic...


"""
test_workflow.py
----------------
Runs full LangGraph workflow safely (emails redirected to test inbox).
"""

from sales.agent.graph import build_pipeline   # adjust import if needed

print("=" * 60)
print("LANGGRAPH WORKFLOW TEST")
print("=" * 60)

# 🔥 Ask user before sending
user_input = input("⚠️ Run full workflow and send emails? (yes/no): ").strip().lower()

if user_input != "yes":
    print("⛔ Aborted")
    exit()

confirm = input("⚠️ Type 'confirm' to proceed: ").strip().lower()
if confirm != "confirm":
    print("⛔ Cancelled")
    exit()

print("\n🚀 Running workflow...\n")

# ✅ Build graph
graph = build_pipeline()

# ✅ Initial state
state = {
    "keyword": "Cloud Services in Ai",
    "send_personalized_emails": False,  # False = BULK FLOW
}

# ✅ Run workflow
import asyncio

result = asyncio.run(graph.ainvoke(state))


print("\n" + "=" * 60)
print("WORKFLOW COMPLETED")
print("=" * 60)

print("Final State:")
print(result)