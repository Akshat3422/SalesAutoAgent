# SalesAutoAgent

SalesAutoAgent is an advanced Agentic Marketing Automation Platform. It leverages AI agents to perform autonomous B2B lead generation, enrichment, website crawling, gap analysis, and personalized outreach dispatching. 

## 🏗️ System Architecture

The platform operates on a modernized, multi-tiered architecture containing a primary orchestrator (Django), a dynamic frontend UI (React), and an isolated microservice for robust email operations.

### 1. Frontend Interface (`/frontend`)
An executive-style dashboard built for tracking, approving, and analyzing marketing campaigns in real time.
- **Framework:** React 18 powered by Vite.
- **Styling:** TailwindCSS 4 with modern design aesthetics (glassmorphism, vibrant palettes).
- **State Management:** Zustand (for global application state and authentication) + React Query (for robust data fetching, caching, and cache invalidation).
- **Features:** 
  - Real-time pipeline tracking (from research to outreach).
  - Approvals Tab: Manually review, edit, skip, or approve personalized AI-generated emails.
  - Bulk Outreach Tab: Review summarized emails for entire campaigns and dispatch bulk emails to primary contacts.
  - Metrics Dashboard: Real-time insights into leads discovered, sites crawled, drafting stats, and success rates.

### 2. Backend Orchestrator (`/sales`)
The core reasoning engine and database authority.
- **Framework:** Django 5 & Django REST Framework (DRF).
- **Authentication:** Token-based authentication via `rest_framework.authtoken`.
- **AI Engine:** LangChain & LangGraph. The backend houses a state-machine based agent pipeline (`graph.py`) which coordinates sequential nodes:
  - *Research Node*: Identifies target company domains via DuckDuckGo.
  - *Discover Buyer Contacts Node*: Sources decision-makers.
  - *Scrape Node*: Extracts full text from target websites for contextual understanding.
  - *Hunter Enrich Node*: Validates email addresses using the Hunter API.
  - *AI Gap Analysis Node*: Analyzes scraped website data to find business gaps and map them directly to predefined "HabileLabs Services".
  - *Outreach Node*: Generates hyper-personalized HTML email drafts per contact.
  - *Send to Companies Node*: Generates summarized company-level HTML emails for bulk campaigns.

### 3. Email Microservice (`email_service.py`)
A fast, isolated microservice responsible solely for email packaging and delivery.
- **Framework:** FastAPI.
- **Responsibilities:** 
  - Exposes an asynchronous `POST /api/send-email` endpoint.
  - Dynamically packages outgoing AI emails as rich `text/html`.
  - Automatically appends essential media (e.g., `HabileLabs_Services.pdf`) to all dispatches.
  - Uses standard SMTP (SendGrid) for secure B2B delivery.

---

## 🗄️ Database Schema

The backend uses Django's ORM (SQLite/PostgreSQL) with a relational structure designed for outreach scalability:

- **Campaign (`campaigns_campaign`)**: 
  - Tracks high-level execution keywords, aggregated analytics (`total_email_send`, `total_companies`), and active pipeline status.
- **Company (`companies_company`)**: 
  - Represents a discovered B2B lead. Stores domain, name, AI-scored metrics, `ai_gaps_detected`, and `ai_recommendations` based on crawler results.
- **Contact (`contacts_contact`)**: 
  - Represents individual employees/decision-makers mapped to a `Company`. Stores name, role, and enriched/verified email addresses.
- **Outreach (`outreach_outreach`)**: 
  - The central junction table mapping a `Contact` to a `Company`. 
  - Distinguishes between `email_type="personalized"` (individualized context) and `email_type="bulk"` (generalized company-wide context).
  - Maintains state tracking (`drafted`, `approved`, `sent`, `failed`) and stores human-edited revisions (`edited_subject`, `edited_body`).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- Active API Keys: OpenAI/Anthropic, Hunter.io, SendGrid (SMTP)

### 1. Environment Setup

Copy your environment variables to the backend:
```bash
# Add your specific API keys to a local .env file in the root
OPENAI_API_KEY="..."
HUNTER_API_KEY="..."
EMAIL_HOST_USER="..."
EMAIL_HOST_PASSWORD="..."
```

### 2. Backend Installation (Django)

```bash
cd sales
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and setup auth tables
python manage.py makemigrations
python manage.py migrate

# Create a superuser (for dashboard login and admin access)
python manage.py createsuperuser

# Start the Django API server (runs on Port 8000)
python manage.py runserver
```

### 3. Email Microservice Installation (FastAPI)

In a new terminal window (with the virtual environment activated):
```bash
# Ensure the root directory has the HabileLabs_Services.pdf attached
uvicorn email_service:app --host 0.0.0.0 --port 8001
```

### 4. Frontend Installation (React)

In a third terminal window:
```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server (runs on Port 3000)
npm run dev
```

### 5. Accessing the Platform
- Open your browser to `http://localhost:3000`
- Log in using the credentials generated via `createsuperuser`
- Enter an industry keyword (e.g., *EdTech India AI*) and click **Run Campaign** to unleash the agents!
