import os
import sys
import asyncio
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sales.sales.settings")
django.setup()

from sales.agent.graph import build_pipeline, AgentState


async def test_strategy():
    keyword_query = "AI voice agents for healthcare customer support"
    print(f"Testing with query: {keyword_query}")

    app = build_pipeline()
    initial_state: AgentState = {
        "keyword": keyword_query,  # We pass it as keyword which will be used as user_query
        "user_query": keyword_query,
        "target_domains": [],
        "scraped_urls": [],
        "emails": [],
        "companies": [],
        "buyer_contacts": [],
        "approval_requests": 0,
        "send_personalized_emails": False,
        "campaign_id": None,
    }

    try:
        # Run just the strategy generation node for quick verification
        # or run the full pipeline astream. Let's just run until strategy_generation
        async for output in app.astream(initial_state):
            if "strategy_generation" in output:
                print("\n--- Strategy Generation Output ---")
                state = output["strategy_generation"]
                print("Strategy Context:")
                print(state.get("strategy"))
                print("\nGenerated Search Queries:")
                for q in state.get("search_queries", []):
                    print(f"- {q}")
                print("----------------------------------\n")
                break  # Stop after strategy generation to save time/API calls

    except Exception as e:
        print(f"Test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_strategy())
