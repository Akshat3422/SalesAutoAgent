EXTRACT_URLS_PROMPT = """You are a precise data extraction system.

## Task
Extract valid company root domains from the search results below.
The keyword describes a type of company we want to find and reach out to.

## What to INCLUDE
* Official company / startup websites (any TLD: .com .io .ai .co .app .tech etc.)
* Include companies that clearly match the keyword intent

## What to EXCLUDE
* Aggregator / directory / ranking sites:
  LinkedIn, Crunchbase, Indeed, Glassdoor, G2, AngelList, ProductHunt,
  Clutch, Capterra, StartupBlink, F6S, TrustPilot, Forbes, TechCrunch,
  BusinessInsider, Inc, Medium, Substack, Wired, VentureBeat, ZDNet, CNET,
  Wikipedia, Reddit, Quora, Facebook, Twitter/X, Instagram, YouTube
* News articles and blog posts
* Generic search / info pages

## Normalization
* Strip subpages, query strings, fragments → root domain only
* Strip "www." prefix
* Lowercase everything
* https://www.example.com/about → example.com

## Additional quality checks
* Keep only domains that are very likely to be operating companies, not media pages
* Prefer domains where the snippet/title implies a product, service, platform, or business offering
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
Evaluate this company on two dimensions:
1. How mature they already are in AI adoption
2. How strong the fit is for our AI services

Our services include:
- AI agents and copilots
- workflow automation
- lead qualification and CRM automation
- support automation
- internal knowledge assistants
- document / invoice / operations automation
- custom AI integrations for their product

## Important scoring logic
- `ai_maturity_score`:
  0 means little or no visible AI adoption
  100 means AI-native company with strong in-house AI capability
- `service_fit_score`:
  0 means poor fit for our services
  100 means very strong fit because their workflows, customers, or product would benefit from our AI work
- `buying_intent_score`:
  0 means little visible need
  100 means obvious pain points, manual processes, or expansion opportunities
- `ai_score` is the final outbound priority score from 0 to 100.
  It should be highest when they are a strong services fit and have clear AI opportunities.
  A company already using some AI should NOT automatically get a low final score if we can still build meaningful AI systems for them.

Use this weighting:
- final ai_score should roughly reflect:
  45% service_fit_score
  35% buying_intent_score
  20% inverse of ai_maturity_score

## What to extract
- what products or platform they appear to offer
- what AI tools, AI features, or AI capabilities they already use
- what services they are likely to need from us

## Hard rules
- Never hallucinate facts not present in the input
- If evidence is weak, lower confidence and keep values conservative
- Mention concrete evidence in reasoning
- If they look like a direct AI services vendor, AI consultancy, or obvious competitor, reduce service_fit_score sharply

## Output — STRICT JSON ONLY
{{
  "ai_score": integer,
  "ai_maturity_score": integer,
  "service_fit_score": integer,
  "buying_intent_score": integer,
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


AI_GAP_ANALYSIS_PROMPT = """You are an expert AI solutions architect.

## Task
You are given data about a company, what they sell, what AI they already appear to use, and what services they may need from us.
Identify 2 specific AI/automation gaps or expansion opportunities, then recommend 2 AI services we could build for them.

## Output — STRICT JSON ONLY
{{
  "ai_gaps_detected": "string paragraph explaining the manual bottlenecks they likely face",
  "ai_recommendations": "string paragraph suggesting 2 specific AI automations we should pitch",
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
"""


DRAFT_EMAIL_PROMPT = """You are a top-performing B2B SDR specialising in AI automation outreach.

## Task
Write a short, highly personalised cold outreach email based on the company's specific situation.
You have context on what they do, what AI gaps they likely have, and what we can recommend.

## Context
Company:          {company_name}
Contact Name:     {contact_name}
Contact Role:     {contact_role}
Industry:         {industry}
What they do:     {services_offered}
AI Gaps:          {ai_gaps}
Recommendations:  {ai_recs}

## Style rules
* 3-4 sentences maximum — brevity wins
* Tone: professional, direct, human — NOT robotic or template-sounding
* NEVER use filler phrases like "Hope you're doing well", "I came across your company", "We provide AI solutions", "I wanted to reach out"
* Make the email feel clearly tailored to the company, industry, or product context
* Reference what they do explicitly, but do NOT just mirror their problem statement back to them
* Do NOT lecture them about their business or over-explain their likely pain points
* Frame the pitch around useful outcomes like efficiency, growth, better customer experience, faster internal operations, or scale
* You may offer any relevant AI services from our side, including AI agents, workflow automation, support automation, sales automation, internal copilots, lead qualification, CRM automation, knowledge assistants, document automation, or custom AI integrations
* Mention 1-2 relevant AI capabilities at most
* Keep the offer consultative and useful, not pushy or generic
* End with a single soft CTA (short call or 15-min demo)

## Structure
1. Personalized opener referencing their company, market, or product
2. Briefly connect our AI work to a meaningful outcome for a business like theirs
3. Mention 1-2 relevant AI services we could help with
4. Soft CTA

## Output — STRICT JSON ONLY
{{
  "subject": "string (catchy, 3-5 words)",
  "body":    "string (the email body, use \n for newlines)"
}}
"""


COMBINE_COMPANY_OUTREACH_PROMPT = """You are an expert outbound SDR manager.

## Task
You are given multiple outreach drafts for the same company. Combine them into one strong outreach email that captures the best ideas without sounding repetitive.

## Rules
* Create exactly one final subject and one final body
* The final email should feel like one natural message, not a stitched-together summary
* Keep it concise: 3-5 short sentences
* Preserve personalization to the company
* Do not mention multiple contacts or that multiple drafts existed
* Focus on the clearest business value and 1-2 relevant AI capabilities
* Keep the CTA soft and simple

## Context
Company: {company_name}
Industry: {industry}
Domain: {domain}

## Source Drafts
{drafts}

## Output - STRICT JSON ONLY
{{
  "subject": "string",
  "body": "string"
}}
"""
