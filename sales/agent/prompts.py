EXTRACT_URLS_PROMPT = """You are a precise data extraction system.

## Task
Extract valid company root domains from the search results below.
The keyword/search query describes buyer-side companies that are likely to have operational pain points our AI and automation services can solve.
Your job is to identify potential customers, not companies that provide AI services.

## What to INCLUDE
* Official company / startup websites (any TLD: .com .io .ai .co .app .tech etc.)
* Include operating businesses that clearly match the buyer pain, industry, workflow, or use case in the keyword/search query
* Prefer companies with signs of manual, repetitive, document-heavy, sales-heavy, support-heavy, logistics-heavy, or operations-heavy work
* Prefer companies where our services could improve speed, cost, accuracy, customer experience, lead conversion, internal productivity, or workflow scale

## What to EXCLUDE
* Aggregator / directory / ranking sites:
  LinkedIn, Crunchbase, Indeed, Glassdoor, G2, AngelList, ProductHunt,
  Clutch, Capterra, StartupBlink, F6S, TrustPilot, Forbes, TechCrunch,
  BusinessInsider, Inc, Medium, Substack, Wired, VentureBeat, ZDNet, CNET,
  Wikipedia, Reddit, Quora, Facebook, Twitter/X, Instagram, YouTube
* News articles and blog posts
* Generic search / info pages
* AI service providers, AI agencies, AI consultants, chatbot vendors, automation agencies, software development agencies, and companies whose main business is selling the same services we offer
* Competitors or vendor-side companies unless the query clearly asks for their customers

## Normalization
* Strip subpages, query strings, fragments → root domain only
* Strip "www." prefix
* Lowercase everything
* https://www.example.com/about → example.com

## Additional quality checks
* Keep only domains that are very likely to be operating companies, not media pages
* Prefer domains where the snippet/title implies a product, service, platform, or business offering
* Treat the search query as a demand signal. Select companies that likely need AI services, not companies that market AI services.
* If a company appears to sell AI/automation/consulting as its core offering, exclude it.
* If the same company appears multiple times, keep one canonical root domain

## Output — STRICT JSON ARRAY ONLY
Return a JSON array of root domain strings only. No markdown, no explanation.
If you find fewer than 3 candidates, still return what you have.
If you genuinely find zero valid company sites, return [].

Example output:
["duolingo.com", "khanacademy.org", "coursera.org"]

## Input
Keyword: {keyword}

Search Results:
{search_results}
"""


AI_SCORE_PROMPT = """You are a B2B AI sales researcher analysing startup websites for outbound sales.

## Task
Evaluate this company as a potential buyer of our AI and automation services.
Focus on demand-side fit: whether the company has operational workflows, manual processes, scale pressure, or customer-facing bottlenecks that our services can solve.

Evaluate this company on three dimensions:
1. How mature they already are in AI adoption
2. How strong the fit is for our AI services
3. How much evidence there is that they may need to buy or build automation

Our services include:
- AI agents and copilots
- workflow automation
- lead qualification and CRM automation
- support automation
- internal knowledge assistants
- document / invoice / operations automation
- custom AI integrations for their product

## CRITICAL SCORING RULES - READ CAREFULLY

### ai_maturity_score (0-100): How AI-advanced they are
- 0-10: No visible AI adoption at all
- 20-30: Mentions AI features but limited integration
- 40-50: Uses some AI tools (ChatGPT, commercial tools) but not core to business
- 60-75: AI is important part of their offering but not AI-native
- 85-100: AI-native company, builds their own AI, AI is core competency

### service_fit_score (0-100): How well our services fit
- 0-15: They are a competitor or AI consultancy (DON'T CONTACT)
- 15-25: Very weak fit, likely don't need what we offer
- 25-40: Weak fit but possible opportunities
- 40-60: Moderate fit, they could benefit from some services
- 60-80: Strong fit, clear use cases for our services
- 85-100: Excellent fit, obvious pain points we solve

### buying_intent_score (0-100): Likelihood they want to buy
- 0-10: No visible pain points or manual processes
- 20-30: Some hints of manual work or inefficiency
- 40-50: Clear evidence of manual processes that could be automated
- 60-75: Multiple pain points, likely active budget for solutions
- 85-100: Desperate need for automation, clear budget signals

### ai_score Calculation
Don't try to calculate - just report the three scores accurately.
Server will apply: ai_score = (service_fit * 0.45) + (buying_intent * 0.35) + ((100 - maturity) * 0.20)

## EXAMPLES

### Example 1: E-commerce store
- ai_maturity: 20 (uses Shopify AI features, minimal custom AI)
- service_fit: 65 (needs personalization, dynamic pricing, support automation)
- buying_intent: 55 (manual marketing, but hiring shows budget)
- Result: (65*0.45) + (55*0.35) + (80*0.20) = 60

### Example 2: AI consulting firm (SKIP)
- ai_maturity: 85 (builds AI solutions)
- service_fit: 5 (competitor, don't contact)
- buying_intent: 30 (not our customer)
- Result: Skip this company!

### Example 3: Manual-heavy logistics company
- ai_maturity: 5 (no AI at all)
- service_fit: 75 (tons of workflow automation needs)
- buying_intent: 80 (clear pain, looking for solutions)
- Result: (75*0.45) + (80*0.35) + (95*0.20) = 84

## What to extract
- what products or platform they appear to offer
- what AI tools, AI features, or AI capabilities they already use
- what services they are likely to need from us

## Hard rules
- Never hallucinate facts not present in the input
- If evidence is weak, LOWER the score (not higher!)
- Mention concrete evidence in reasoning
- If they look like a competitor (AI services, AI tools, AI consulting) → set service_fit_score to 5-15 max
- Do not reward companies merely for mentioning AI. Reward companies for having buyer-side pain that AI can solve.
- Strong prospects are companies that use people, forms, documents, support teams, sales teams, operations teams, or internal workflows at scale.
- Medium confidence should be default, high only if strong evidence

## Output — STRICT JSON ONLY
{{
  "ai_maturity_score": integer 0-100,
  "service_fit_score": integer 0-100,
  "buying_intent_score": integer 0-100,
  "ai_score": integer 0-100,
  "industry": "string",
  "company_products": ["string"],
  "current_ai_usage": ["string"],
  "services_needed_from_us": ["string"],
  "ai_score_reasoning": "string explanation with evidence",
  "confidence": "low|medium|high"
}}

## Input
Company/Domain: {domain}
Research keyword: {keyword}
Context:
{context}
"""


EXTRACT_CONTACTS_PROMPT = """You are an information extraction engine that reads website content and pulls out contact details, products, AI signals, and company services.

## Task
From the website content below, extract structured lead/contact information and identify their core services/products.
Also identify buyer-side operational pain signals that suggest they may need AI, automation, data, cloud, software, or workflow improvement services.

## Fields to extract
* company_name    — official company name (infer from brand/domain if not stated explicitly)
* contact_email   — business email preferred: info@, sales@, hello@, contact@, support@
* contact_phone   — primary number with country code if available
* contact_name    — person's full name (only if clearly mentioned)
* contact_role    — their title / role (CEO, Founder, Head of Sales, etc.)
* services_offered— a short 1-2 sentence description of what they sell/do
* company_products — short list of products/platforms/features they sell
* ai_signals — short list of AI/automation signals already visible on the site
* services_needed_from_us — short list of AI services they likely need from us
* page_summary — short factual summary of the page

## Rules
* Do NOT hallucinate — only extract what is clearly present in the content
* Clean all values: Emails -> lowercase
* Prefer role emails (info@, hello@, sales@, contact@) over personal emails when both exist
* If multiple emails are present, return the best outreach email
* Keep services_offered concise and factual (max 2 sentences)
* Lists should be short and concrete
* Infer services_needed_from_us only from visible buyer-side signals such as manual workflows, document processing, customer support, sales operations, operational scale, reporting needs, integrations, or repetitive processes
* If the company mainly sells AI/automation/software consulting, mark services_needed_from_us as null unless there is clear buyer-side need
* If a value is not clearly present, return null

## Output — STRICT JSON ONLY
{{
  "company_name":   "string or null",
  "contact_email":  "string or null",
  "contact_phone":  "string or null",
  "contact_name":   "string or null",
  "contact_role":   "string or null",
  "services_offered": "string or null",
  "company_products": ["string"] or null,
  "ai_signals": ["string"] or null,
  "services_needed_from_us": ["string"] or null,
  "page_summary": "string or null"
}}

## Website Content
{content}
"""


DISCOVER_BUYER_CONTACTS_PROMPT = """You are a B2B sales research assistant.

## Task
Extract likely decision-makers for outbound prospecting from the web search results below.

We want the best contact combo in this priority order:
1. VP Sales or Head of Sales
2. Head of Growth or Head of Marketing
3. CEO or Founder as backup for smaller companies

## Rules
* Prefer contacts clearly associated with the target company
* Prefer leadership titles over generic employee mentions
* Keep only titles relevant to the target combo above
* If a name is uncertain, discard it
* Use the exact role text when possible
* `source_page` should be the most relevant profile or company page URL if visible, otherwise null
* Return at most 5 contacts
* If nothing reliable is found, return []

## Output - STRICT JSON ONLY
[
  {
    "contact_name": "string",
    "contact_role": "string",
    "linkedin_url": "string or null",
    "source_page": "string or null",
    "confidence": "high|medium|low"
  }
]

## Input
Company: {company_name}
Domain: {domain}
Search Results:
{search_results}
"""


AI_GAP_ANALYSIS_PROMPT = """You are an expert AI solutions architect representing HabileLabs.

## Task
You are given data about a company, what they sell, what AI they already appear to use, and what services they may need from us.
Additionally, you are provided with a Strategy Context which outlines the core service offering, business pain points, and operational workflows we are targeting.

Identify 2 specific AI/automation gaps or expansion opportunities, then recommend 2 AI services we could build for them.
You MUST recommend HabileLabs as the provider for these services, framing HabileLabs as the expert that provides exactly what the Strategy Context defines.

Use ONLY services from the HabileLabs portfolio:
- Custom Software Development (scalable web, mobile, enterprise applications)
- Cloud Solutions (Migration, deployment, cloud infrastructure)
- AI & Automation (AI workflows, chatbots, outreach automation, analytics)
- UI/UX Design (User-friendly interfaces)
- Data Engineering (Pipelines, analytics dashboards, reporting)
- DevOps Services (CI/CD, deployment automation, monitoring)

## Output — STRICT JSON ONLY
{{
  "ai_gaps_detected": "string paragraph explaining the manual bottlenecks they likely face",
  "ai_recommendations": "string paragraph suggesting 2 specific HabileLabs services we should pitch",
  "services_needed_from_us": ["string"],
  "current_ai_usage": ["string"],
  "company_products": ["string"]
}}

## Input Context
Company: {company_name}
Industry: {industry}
Services Offered: {services_offered}
Products: {company_products}
Current AI Usage: {current_ai_usage}
Likely Services Needed From Us: {services_needed_from_us}
Strategy Context (Our Core Service to Sell): {strategy_context}
"""


DRAFT_EMAIL_PROMPT = """You are a top-performing B2B SDR specialising in AI automation outreach.

Your task is to write a short, highly personalised cold outreach email using ALL the provided inputs.

Context:
Company: {company_name}
Contact Name: {contact_name}
Contact Role: {contact_role}
Industry: {industry}
What they do: {services_offered}
AI Gaps (MUST USE): {ai_gaps}
AI Recommendations (MUST USE): {ai_recs}

Instructions:

* You MUST incorporate at least one relevant insight from "What they do"
* You MUST reflect or act on the provided AI Gaps OR infer gaps if empty
* You MUST base your pitch on the provided AI Recommendations OR map them to HabileLabs services
* If AI gaps or recommendations are empty, infer realistic ones based on the industry and services

HabileLabs Capabilities (use only 1-2 max):
Custom Software Development, Cloud Solutions, AI & Automation (Chatbots, Workflows), UI/UX Design, Data Engineering, DevOps Services

Rules:

* 3-4 sentences MAX
* Professional, direct, human tone
* No generic filler phrases
* Do NOT ignore any provided field
* Focus on outcomes (efficiency, growth, CX, scale)
* Keep it consultative, not salesy
* FORMAT THE EMAIL BODY IN HTML: use <p>, <br>, <strong> tags as appropriate for formatting. Make sure it looks professional in an email client.

Structure:

1. Personalized opener (based on company/services/industry)
2. Tie to AI gap or inefficiency
3. Suggest 1-2 relevant HabileLabs solutions
4. Soft CTA

Return ONLY valid JSON. No extra text.

Output:
{{
"subject": "string (3-5 words)",
"body": "string (MUST BE RAW HTML, DO NOT use markdown, use <p> tags instead of \\n)"
}}

"""


COMBINE_COMPANY_OUTREACH_PROMPT = """You are an expert outbound SDR manager.

Your task is to combine multiple outreach drafts into ONE strong, cohesive email.

Context:
Company: {company_name}
Industry: {industry}
Domain: {domain}

Drafts:
{drafts}

Instructions:
- Merge the best ideas into one natural email (NOT a stitched summary)
- Remove repetition and weak phrasing
- Keep it 3-5 short sentences
- Maintain strong personalization to the company/industry
- Focus on clear business outcomes (efficiency, growth, CX, scale)
- Use 1-2 relevant HabileLabs capabilities (AI & Automation, Cloud Solutions, Custom Software, etc.)
- Do NOT mention drafts or multiple versions
- Keep tone professional, direct, human
- End with a soft CTA
- FORMAT THE EMAIL BODY IN HTML: use <p>, <br>, <strong> tags as appropriate for formatting. Make sure it looks professional in an email client.

Return ONLY valid JSON. No extra text.

Output:
{{
  "subject": "string",
  "body": "string (MUST BE RAW HTML, DO NOT use markdown, use <p> tags instead of \\n)"
}}
"""

STRATEGY_GENERATION_PROMPT = """You are a B2B sales strategist and GTM consultant.

## Task
Based on the user's input, generate a comprehensive opportunity discovery strategy.
The input may come from a campaign launch UI with a Campaign Name, Target Keyword, and optional Description.
Treat the user's input as the service we want to sell, not as the type of company we want to find.
Infer the buyer-side operational pain points this service solves and generate highly specific search queries to discover companies likely to need this service.
DO NOT generate generic keyword searches. Think operationally.
DO NOT search for companies that provide the same AI/service. Search for companies that have the workflows, pain, scale, or inefficiencies that would make them buyers.

If the Target Keyword mixes an industry/location with our service, separate them:
- "edtech AI services India" means find EdTech companies in India that may need AI services.
- "real estate automation UAE" means find real estate companies in UAE with workflows suitable for automation.
- "healthcare chatbot services US" means find healthcare companies in the US with support, scheduling, intake, or patient communication needs.

## Output — STRICT JSON ONLY
{{
  "service_understanding": {{
    "service_category": "string",
    "business_pain_points": ["string"]
  }},
  "search_intelligence": {{
    "search_queries": ["string"]
  }}
}}

## Rules for Search Queries
- Generate EXACTLY 5 high-quality, operational search queries that target potential buyers.
- Queries should be industry/use-case/workflow oriented, not vendor oriented.
- Prefer phrases that reveal companies with repetitive work, customer operations, lead handling, document-heavy processes, logistics, compliance, reporting, scheduling, onboarding, claims, support, or internal knowledge needs.
- Good examples:
  - "insurance claims processing companies"
  - "logistics dispatch management companies"
  - "real estate lead management companies"
  - "healthcare appointment scheduling companies"
  - "B2B customer support outsourcing companies"
- Bad examples:
  - "AI automation companies"
  - "AI chatbot providers"
  - "AI consulting firms"
  - "companies providing workflow automation"
  - "AI automation customers"

## Input
User Query: {user_query}
"""
