import os
import sys
import django
import asyncio

# 1. Setup Django environment to allow DB imports in the graph logic
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sales.sales.settings")

django.setup()

from sales.agent.graph import execute_pipeline


async def main():
    print("Initializing test...")

    # You can visualize the graph using this if needed:
    # app = build_pipeline()
    # with open("graph.png", "wb") as f:
    #     f.write(app.get_graph().draw_mermaid_png())
    # print("Saved graph visualization to graph.png")

    keyword = "Small Statrtups requiring CRM"
    print(f"Executing pipeline with keyword: {keyword}")

    # Run the pipeline
    await execute_pipeline(keyword)

    print(
        "Testing completed. Check the database and agent_execution.log for the results!"
    )


if __name__ == "__main__":
    asyncio.run(main())
