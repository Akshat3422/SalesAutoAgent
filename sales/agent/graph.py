import asyncio
import os
import re
import sys
import json
import logging
import socket
import requests
from typing import Dict, Any, List, TypedDict, Optional, Tuple
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, urlunparse

from asgiref.sync import sync_to_async

# ──────────────────────────────────────────────────────────────────────────────
# Logger — UTF-8 forced on StreamHandler so Windows cp1252 never chokes on
# Unicode arrows (→) or other non-ASCII chars in log messages.
# ──────────────────────────────────────────────────────────────────────────────
logger = logging.getLogger("agent_pipeline")
logger.setLevel(logging.INFO)

_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# File handler — always UTF-8
_fh = logging.FileHandler(
    os.path.join(os.path.dirname(__file__), "agent_execution.log"),
    encoding="utf-8",
)
_fh.setFormatter(_formatter)
logger.addHandler(_fh)

# Console handler — wrap stdout in utf-8 writer so Windows cp1252 never errors
_ch = logging.StreamHandler(
    stream=open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
    if hasattr(sys.stdout, 'fileno') else sys.stdout
)
_ch.setFormatter(_formatter)
logger.addHandler(_ch)


# ──────────────────────────────────────────────────────────────────────────────
# Django Models
# ──────────────────────────────────────────────────────────────────────────────
from sales.companies.models import Company
from sales.contacts.models import Contact
from sales.outreach.models import Outreach
from sales.DataSource.models import DataSource
from sales.DataChunk.models import DataChunkProcess

# LangChain / LangGraph
from langgraph.graph import StateGraph, START, END
from langchain_community.tools import DuckDuckGoSearchRun
from openai import OpenAI

def normalize_azure_base_url(raw_endpoint: str | None) -> str | None:
    if not raw_endpoint:
        return raw_endpoint

    cleaned = raw_endpoint.rstrip("/")

    if cleaned.endswith("/openai/v1"):
        return f"{cleaned}/"

    if cleaned.endswith("/openai"):
        return f"{cleaned}/v1/"

    return f"{cleaned}/openai/v1/"

def call_llm(prompt: str, temperature: float = 0.0) -> str:
    endpoint = normalize_azure_base_url(os.getenv("AZURE_OPENAI_ENDPOINT"))
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    
    client = OpenAI(
        api_key=api_key,
        base_url=endpoint,
    )
    
    response = client.chat.completions.create(
        model=deployment,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

from sales.agent.prompts import (
    EXTRACT_URLS_PROMPT, 
    EXTRACT_CONTACTS_PROMPT, 
    DRAFT_EMAIL_PROMPT,
    AI_SCORE_PROMPT,
    AI_GAP_ANALYSIS_PROMPT,
    DISCOVER_BUYER_CONTACTS_PROMPT,
)

# Web Crawler
try:
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig
    CRAWLER_AVAILABLE = True
except ImportError:
    CRAWLER_AVAILABLE = False


# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────
MAX_URLS_PER_DOMAIN = 30
MAX_URLS_PER_DOMAIN_DEEP = 50
MAX_RESEARCH_DOMAINS = 25
MIN_ACCEPTABLE_SCORE = 35
HUNTER_EMAIL_FINDER_URL = "https://api.hunter.io/v2/email-finder"
HUNTER_DOMAIN_SEARCH_URL = "https://api.hunter.io/v2/domain-search"
HUNTER_TIMEOUT_SECONDS = 20
MAX_HOST_NETWORK_FAILURES = 2
HUNTER_DECISION_KEYWORDS = (
    "ceo", "founder", "co-founder", "coo", "cto", "cmo", "cro",
    "vp", "vice president", "head", "director", "chief",
)

# Priority slug tables  (score, slug)
CORE_PRIORITY_SLUGS: List[Tuple[int, str]] = [
    (3, "contact"), (3, "contact-us"), (3, "contactus"), (3, "get-in-touch"), (3, "reach-us"),
    (3, "team"), (3, "our-team"), (3, "the-team"), (3, "people"), (3, "staff"), (3, "leadership"),
    (3, "founders"), (3, "meet-the-team"), (3, "executives"),
    (2, "about"), (2, "about-us"), (2, "aboutus"), (2, "company"), (2, "our-story"),
    (2, "who-we-are"), (2, "mission"), (2, "vision"),
    (1, "products"), (1, "product"), (1, "services"), (1, "service"), (1, "solutions"),
    (1, "platform"), (1, "features"), (1, "pricing"), (1, "how-it-works"),
]
EXPLORATORY_PRIORITY_SLUGS: List[Tuple[int, str]] = [
    (1, "careers"),
    (1, "customers"), (1, "case-studies"), (1, "use-cases"), (1, "resources"),
    (1, "integrations"), (1, "automation"), (1, "artificial-intelligence"), (1, "ai"),
    (1, "blog"), (1, "faq"),
]

_SKIP_EXTENSIONS = (
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.zip', '.rar',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
    '.mp4', '.mp3', '.avi', '.mov',
)

BUSINESS_EMAIL_PREFIXES = (
    "info@", "hello@", "sales@", "contact@", "support@", "business@", "partnerships@"
)
BUYER_ROLE_QUERIES = (
    "vp sales",
    "head of sales",
    "head of growth",
    "head of marketing",
    "ceo",
    "founder",
)
BUYER_DISCOVERY_QUERY_TEMPLATES = (
    '{company_name} leadership team executives site:{host}',
    '{company_name} vp sales OR "head of sales" OR "head of growth" OR "head of marketing" site:linkedin.com',
    '{company_name} ceo OR founder OR managing director site:{host}',
)
BUYER_SEARCH_FAILURE_LIMIT = 2

VALID_COMPOUND_SUFFIXES = {
    "ac.in", "co.in", "co.uk", "com.au", "com.sg", "net.in", "org.in", "org.uk",
}
_HOST_RE = re.compile(
    r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$"
)
_TLD_RE = re.compile(r"^[a-z]{2,24}$")
_DNS_CACHE: Dict[str, bool] = {}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def sanitize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    clean = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=netloc,
        path="",
        params="",
        query="",
        fragment=""
    )
    return urlunparse(clean)


def extract_company_name_from_host(host: str) -> str:
    parts = host.lower().split('.')
    if parts[0] == 'www' and len(parts) > 1:
        return parts[1].capitalize()
    return parts[0].capitalize()


def safe_parse_llm_json(raw: str, context: str = "") -> Optional[Any]:
    if not raw or not raw.strip():
        logger.warning(f"[JSON] Empty response — context={context}")
        return None

    text = raw.strip()

    if "```json" in text:
        try:
            text = text.split("```json")[1].split("```")[0].strip()
        except IndexError:
            pass
    elif "```" in text:
        try:
            text = text.split("```")[1].split("```")[0].strip()
        except IndexError:
            pass

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        end   = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

    logger.warning(f"[JSON] Could not parse LLM output — context={context} preview={repr(raw[:120])}")
    return None


def url_priority_score(url: str) -> int:
    path = urlparse(url).path.lower().strip('/')
    segments = re.split(r'[-_/]', path)
    best = -1
    for score, slug in CORE_PRIORITY_SLUGS + EXPLORATORY_PRIORITY_SLUGS:
        if slug in segments or slug == path:
            best = max(best, score)
    return best


def build_priority_seed_urls(base_url: str, include_exploratory: bool = False) -> List[Tuple[int, str]]:
    parsed = urlparse(base_url)
    base   = f"{parsed.scheme}://{parsed.netloc}"
    seen: set = set()
    out: List[Tuple[int, str]] = []
    slug_groups = list(CORE_PRIORITY_SLUGS)
    if include_exploratory:
        slug_groups.extend(EXPLORATORY_PRIORITY_SLUGS)

    for score, slug in slug_groups:
        u = f"{base}/{slug}"
        if u not in seen:
            seen.add(u)
            out.append((score, u))
    out.sort(key=lambda x: x[0], reverse=True)
    return out


def _looks_relevant_domain(domain: str, keyword: str) -> bool:
    # Keep relevance gate permissive to avoid false negatives.
    # Final acceptance is handled by AI scoring.
    _ = keyword
    host = urlparse(sanitize_url(domain)).netloc.lower()
    return _is_valid_company_host(host)


def _is_valid_company_host(host: str) -> bool:
    if not host or len(host) > 253 or host.count(".") < 1:
        return False
    if host.startswith("www."):
        host = host[4:]
    if not _HOST_RE.fullmatch(host):
        return False

    parts = host.split(".")
    if len(parts) > 4:
        return False

    suffix = ".".join(parts[-2:]) if len(parts) >= 2 else parts[-1]
    tld = parts[-1]
    if suffix not in VALID_COMPOUND_SUFFIXES and not _TLD_RE.fullmatch(tld):
        return False

    return any(char.isalpha() for char in parts[0])


async def _domain_resolves(host: str) -> bool:
    if not host:
        return False
    cached = _DNS_CACHE.get(host)
    if cached is not None:
        return cached

    def _resolve() -> bool:
        try:
            socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            return True
        except socket.gaierror:
            return False
        except OSError:
            return False

    resolved = await asyncio.to_thread(_resolve)
    _DNS_CACHE[host] = resolved
    return resolved


def _extract_emails(text: str) -> List[str]:
    raw = re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text or "")
    cleaned = []
    seen = set()
    for e in raw:
        email = e.lower().strip(".,;:()[]{}<>")
        if email in seen:
            continue
        seen.add(email)
        cleaned.append(email)
    return cleaned


def _pick_best_email(emails: List[str]) -> Optional[str]:
    if not emails:
        return None
    for prefix in BUSINESS_EMAIL_PREFIXES:
        for email in emails:
            if email.startswith(prefix):
                return email
    return emails[0]


def _extract_phone(text: str) -> Optional[str]:
    matches = re.findall(r"(?:\+?\d[\d\s\-\(\)]{7,}\d)", text or "")
    if not matches:
        return None
    return matches[0].strip()


def _coerce_int(value: Any, default: int = 0) -> int:
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return default


def _normalize_string_list(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, str):
        parts = re.split(r"[,|\n]", value)
    elif isinstance(value, list):
        parts = value
    else:
        return []

    out: List[str] = []
    seen = set()
    for item in parts:
        if item is None:
            continue
        text = str(item).strip(" -\t\r\n")
        if not text:
            continue
        lowered = text.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        out.append(text[:160])
    return out


def _format_signal_block(label: str, values: List[str]) -> str:
    if not values:
        return f"{label}: none"
    return f"{label}: " + "; ".join(values[:8])


def _build_score_context(keyword: str, domain: str, context: str, company: Optional[Company] = None, page_signals: Optional[Dict[str, List[str]]] = None) -> str:
    chunks = [f"Keyword: {keyword}", f"Domain: {domain}", f"Research context: {context[:2000]}"]

    if company:
        chunks.append(f"Industry: {company.industry or 'unknown'}")
        chunks.append(f"Services offered: {company.services_offered or 'unknown'}")

    if page_signals:
        chunks.append(_format_signal_block("Products", page_signals.get("company_products", [])))
        chunks.append(_format_signal_block("Current AI usage", page_signals.get("current_ai_usage", [])))
        chunks.append(_format_signal_block("Services needed from us", page_signals.get("services_needed_from_us", [])))
        chunks.append(_format_signal_block("Page summaries", page_signals.get("page_summaries", [])))

    return "\n".join(chunks)


def _serialize_score_reasoning(score_data: Dict[str, Any]) -> str:
    maturity = _coerce_int(score_data.get("ai_maturity_score"), 0)
    fit = _coerce_int(score_data.get("service_fit_score"), 0)
    intent = _coerce_int(score_data.get("buying_intent_score"), 0)
    products = ", ".join(_normalize_string_list(score_data.get("company_products"))) or "not clear"
    current_ai = ", ".join(_normalize_string_list(score_data.get("current_ai_usage"))) or "not clear"
    needed = ", ".join(_normalize_string_list(score_data.get("services_needed_from_us"))) or "not clear"
    reasoning = score_data.get("ai_score_reasoning", "No reasoning available")
    return (
        f"{reasoning}\n"
        f"AI maturity: {maturity}/100 | Service fit: {fit}/100 | Buying intent: {intent}/100. "
        f"Products: {products}. Current AI usage: {current_ai}. Services needed from us: {needed}."
    )


def _normalize_contact_candidates(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []

    out: List[Dict[str, Any]] = []
    seen = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        contact_name = str(item.get("contact_name") or "").strip()
        contact_role = str(item.get("contact_role") or "").strip()
        if not contact_name or not contact_role:
            continue
        lowered_role = contact_role.lower()
        if not any(role in lowered_role for role in BUYER_ROLE_QUERIES):
            continue

        linkedin_url = str(item.get("linkedin_url") or "").strip() or None
        source_page = str(item.get("source_page") or "").strip() or None
        confidence = str(item.get("confidence") or "medium").lower()
        key = (contact_name.lower(), contact_role.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "contact_name": contact_name[:255],
            "contact_role": contact_role[:255],
            "linkedin_url": linkedin_url if linkedin_url and linkedin_url.startswith(("http://", "https://")) else None,
            "source_page": source_page if source_page and source_page.startswith(("http://", "https://")) else None,
            "confidence": confidence if confidence in {"high", "medium", "low"} else "medium",
        })
    return out[:5]


async def _safe_search(search_tool: DuckDuckGoSearchRun, query: str, context: str, retries: int = 3) -> Optional[str]:
    for attempt in range(retries):
        try:
            result = await asyncio.to_thread(search_tool.run, query)
            if isinstance(result, str):
                cleaned = result.strip()
                if cleaned:
                    return cleaned
            return None
        except Exception as exc:
            exc_name = type(exc).__name__
            if attempt < retries - 1:
                logger.warning(f"[Search] {context}: {exc_name} - Retrying ({attempt + 1}/{retries})...")
                await asyncio.sleep(2 ** attempt + 3)
            else:
                logger.warning(f"[Search] {context}: {exc_name} - Final failure after {retries} attempts")
                return None
    return None


def _format_contact_summary(contacts: List[Dict[str, Any]]) -> str:
    if not contacts:
        return "none"
    preview = []
    for contact in contacts[:5]:
        name = contact.get("contact_name") or "Unknown"
        role = contact.get("contact_role") or "Unknown role"
        preview.append(f"{name} ({role})")
    return "; ".join(preview)


def _is_network_failure(message: str) -> bool:
    text = (message or "").lower()
    markers = (
        "err_connection_timed_out",
        "timeout",
        "err_timed_out",
        "err_connection_reset",
        "err_connection_closed",
        "err_name_not_resolved",
        "err_ssl_protocol_error",
        "net::",
    )
    return any(marker in text for marker in markers)


def _is_hunter_decision_maker(position: str) -> bool:
    lowered = (position or "").lower()
    return any(keyword in lowered for keyword in HUNTER_DECISION_KEYWORDS)


async def _hunter_find_contacts(domain: str, limit: int = 10) -> List[Dict[str, Any]]:
    api_key = os.getenv("HUNTER_API_KEY")
    if not api_key:
        return []

    def _request() -> List[Dict[str, Any]]:
        try:
            response = requests.get(
                HUNTER_DOMAIN_SEARCH_URL,
                params={
                    "domain": domain,
                    "api_key": api_key,
                    "limit": limit,
                },
                timeout=HUNTER_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            logger.warning(f"[Hunter] Domain search failed for {domain}: {type(exc).__name__}")
            return []
        except ValueError:
            logger.warning(f"[Hunter] Invalid JSON for domain search {domain}")
            return []

        data = payload.get("data") or {}
        emails = data.get("emails") or []
        found: List[Dict[str, Any]] = []
        seen = set()
        for person in emails:
            if not isinstance(person, dict):
                continue
            position = str(person.get("position") or "").strip()
            email = str(person.get("value") or "").strip().lower()
            if not email or not _is_hunter_decision_maker(position):
                continue

            first_name = str(person.get("first_name") or "").strip()
            last_name = str(person.get("last_name") or "").strip()
            full_name = f"{first_name} {last_name}".strip()
            if not full_name:
                full_name = str(person.get("name") or "").strip() or "Unknown"

            key = (full_name.lower(), position.lower(), email)
            if key in seen:
                continue
            seen.add(key)
            found.append({
                "contact_name": full_name[:255],
                "contact_role": position[:255] or "Unknown",
                "contact_email": email,
                "hunter_score": person.get("score"),
                "hunter_confidence": person.get("confidence"),
                "source_page": None,
            })
        return found[:5]

    return await asyncio.to_thread(_request)


def _should_skip_domain(score_data: Dict[str, Any]) -> bool:
    final_score = _coerce_int(score_data.get("ai_score"), 50)
    fit_score = _coerce_int(score_data.get("service_fit_score"), 50)
    ai_maturity = _coerce_int(score_data.get("ai_maturity_score"), 50)
    confidence = str(score_data.get("confidence", "low")).lower()
    return final_score < 20 and fit_score < 25 and ai_maturity > 80 and confidence == "high"


def _should_deep_scrape(score_data: Dict[str, Any]) -> bool:
    final_score = _coerce_int(score_data.get("ai_score"), 50)
    fit_score = _coerce_int(score_data.get("service_fit_score"), 50)
    confidence = str(score_data.get("confidence", "low")).lower()
    return final_score < MIN_ACCEPTABLE_SCORE or fit_score < 50 or confidence == "low"


def _collect_page_signals(chunks: List[DataChunkProcess]) -> Dict[str, List[str]]:
    products: List[str] = []
    current_ai: List[str] = []
    services_needed: List[str] = []
    page_summaries: List[str] = []

    for chunk in chunks:
        payload = chunk.result_data or {}
        products.extend(_normalize_string_list(payload.get("company_products")))
        current_ai.extend(_normalize_string_list(payload.get("ai_signals")))
        services_needed.extend(_normalize_string_list(payload.get("services_needed_from_us")))
        page_summaries.extend(_normalize_string_list(payload.get("page_summary")))

    return {
        "company_products": _normalize_string_list(products),
        "current_ai_usage": _normalize_string_list(current_ai),
        "services_needed_from_us": _normalize_string_list(services_needed),
        "page_summaries": _normalize_string_list(page_summaries),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Graph State
# ──────────────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    keyword: str
    target_domains: List[Dict[str, Any]]
    scraped_urls: List[str]
    emails: List[str]
    companies: List[Dict[str, str]]
    buyer_contacts: List[Dict[str, Any]]


# ──────────────────────────────────────────────────────────────────────────────
# Research helpers
# ──────────────────────────────────────────────────────────────────────────────

_EXCLUDED_DOMAINS = {
    "linkedin.com", "crunchbase.com", "indeed.com", "glassdoor.com",
    "g2.com", "angellist.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "youtube.com", "reddit.com", "quora.com",
    "gmail.com",
    "forbes.com", "techcrunch.com", "businessinsider.com", "inc.com",
    "medium.com", "substack.com", "wikipedia.org", "wikidata.org",
    "ycombinator.com", "producthunt.com", "capterra.com", "getapp.com",
    "trustpilot.com", "clutch.co", "startupblink.com", "f6s.com",
    "venturebeat.com", "wired.com", "zdnet.com", "cnet.com",
}

_DOMAIN_RE = re.compile(
    r'(?:https?://)?(?:www\.)?'
    r'([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?'
    r'(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*'
    r'\.[a-zA-Z]{2,})'
)

def _regex_extract_domains(text: str) -> List[str]:
    found = []
    for match in _DOMAIN_RE.finditer(text):
        domain = match.group(1).lower()
        parts = domain.split('.')
        if len(parts) < 2 or len(parts[-1]) < 2:
            continue
        root = '.'.join(parts[-2:])
        if root not in _EXCLUDED_DOMAINS and domain not in _EXCLUDED_DOMAINS:
            found.append(domain)
    seen: set = set()
    out = []
    for d in found:
        if d not in seen:
            seen.add(d)
            out.append(d)
    return out


# ──────────────────────────────────────────────────────────────────────────────
# NODE 1 — RESEARCH
# ──────────────────────────────────────────────────────────────────────────────

async def research_node(state: AgentState) -> AgentState:
    keyword = state['keyword']
    logger.info(f"[Node 1] Researching keyword: {keyword}")

    search = DuckDuckGoSearchRun()
    queries = [
        keyword,
        f"{keyword} official website",
        f"{keyword} startup site:*.com OR site:*.io OR site:*.ai",
        f"{keyword} company website",
        f"{keyword} SaaS platform",
    ]
    all_results = ""
    for q in queries:
        result = await _safe_search(search, q, context=f"research/{keyword}")
        if result:
            logger.info(f"[Node 1] Query '{q}' -> {len(result)} chars")
            all_results += result + "\n"
        else:
            logger.warning(f"[Node 1] Search query failed or empty: {q}")
        await asyncio.sleep(2)

    logger.info(f"[Node 1] Total search text length: {len(all_results)}")

    prompt = EXTRACT_URLS_PROMPT.format(keyword=keyword, search_results=all_results[:4000])
    response_content = call_llm(prompt, temperature=0.0)
    
    llm_urls = safe_parse_llm_json(response_content, context="research/url_extraction")
    regex_urls = _regex_extract_domains(all_results)
    urls: List[str] = []
    for candidate in (llm_urls or []) + regex_urls:
        if not isinstance(candidate, str):
            continue
        dom = candidate.strip().lower()
        if not dom:
            continue
        if any(exc in dom for exc in _EXCLUDED_DOMAINS):
            continue
        if not _looks_relevant_domain(dom, keyword):
            logger.info(f"[Node 1] Rejected malformed domain candidate: {dom}")
            continue
        host = urlparse(sanitize_url(dom)).netloc
        if not await _domain_resolves(host):
            logger.info(f"[Node 1] Rejected unresolved/non-company candidate: {dom}")
            continue
        if dom not in urls:
            urls.append(dom)
    urls = urls[:MAX_RESEARCH_DOMAINS]
    logger.info(f"[Node 1] Final domains to process: {urls}")

    target_domains: List[Dict[str, Any]] = []

    async def score_and_create(u: str) -> Optional[Dict[str, Any]]:
        domain = sanitize_url(u)
        host = urlparse(domain).netloc
        company_name = extract_company_name_from_host(host)

        @sync_to_async
        def get_existing_company():
            return Company.objects.filter(domain=domain).first()

        existing_company = await get_existing_company()
        if existing_company:
            if existing_company.do_not_contact:
                logger.info(f"[Node 1] Skipping DNC company: {domain}")
                return None

        logger.info(f"[Node 1] AI Scoring: {domain}")
        score_prompt = AI_SCORE_PROMPT.format(
            domain=domain,
            keyword=keyword,
            context=_build_score_context(keyword, domain, all_results[:2000]),
        )
        score_resp_content = call_llm(score_prompt, temperature=0.0)
        score_data = safe_parse_llm_json(score_resp_content, context=f"research/score_{domain}") or {}
        
        ai_score = _coerce_int(score_data.get("ai_score"), 50)
        ai_reasoning = _serialize_score_reasoning(score_data)
        industry = score_data.get("industry", "Unknown")
        deep_scrape = _should_deep_scrape(score_data)

        if _should_skip_domain(score_data):
            logger.info(f"[Node 1] Scoring {domain}: {ai_score} - Skipping (Very weak fit)")
            return None

        @sync_to_async
        def create_lead() -> Dict[str, Any]:
            company, _ = Company.objects.get_or_create(domain=domain, defaults={'company_name': company_name})
            company.company_name = company.company_name or company_name
            company.industry = industry
            company.ai_score = ai_score
            company.ai_score_reasoning = ai_reasoning
            company.crawl_status = 'pending'
            company.save()
            ds, _ = DataSource.objects.get_or_create(
                domain=domain,
                type=DataSource.URL,
            )
            return {
                "domain": domain,
                "company_id": company.id,
                "ds_id": ds.id,
                "company_name": company_name,
                "initial_ai_score": ai_score,
                "deep_scrape": deep_scrape,
                "current_ai_usage": _normalize_string_list(score_data.get("current_ai_usage")),
                "company_products": _normalize_string_list(score_data.get("company_products")),
                "services_needed_from_us": _normalize_string_list(score_data.get("services_needed_from_us")),
            }

        return await create_lead()

    scoring_sem = asyncio.Semaphore(6)

    async def _score_with_sem(domain: str):
        async with scoring_sem:
            return await score_and_create(domain)

    scored = await asyncio.gather(*[_score_with_sem(u) for u in urls], return_exceptions=True)
    for entry in scored:
        if isinstance(entry, dict):
            target_domains.append(entry)

    companies_list = list(state.get('companies', []))
    for tgt in target_domains:
        companies_list.append({
            "domain": tgt['domain'],
            "company_name": tgt.get("company_name", "Unknown"),
        })
        logger.info(f"[Node 1] Accepted company: {tgt.get('company_name', 'Unknown')} | domain: {tgt['domain']}")

    return {**state, 'target_domains': target_domains, 'companies': companies_list}


async def discover_buyer_contacts_node(state: AgentState) -> AgentState:
    logger.info("[Node 1B] Discovering buyer contacts")

    search = DuckDuckGoSearchRun()
    discovered_contacts: List[Dict[str, Any]] = []
    target_domains = list(state.get("target_domains", []))

    async def process_target(tgt: Dict[str, Any]) -> List[Dict[str, Any]]:
        company_name = tgt.get("company_name") or extract_company_name_from_host(urlparse(tgt["domain"]).netloc)
        domain = tgt["domain"]
        host = urlparse(domain).netloc

        search_blocks: List[str] = []
        failed_searches = 0
        for template in BUYER_DISCOVERY_QUERY_TEMPLATES:
            query = template.format(company_name=company_name, host=host)
            result = await _safe_search(search, query, context=f"buyer_contacts/{company_name}")
            if result:
                search_blocks.append(f"Query: {query}\n{result[:1800]}")
                await asyncio.sleep(2)
                continue

            failed_searches += 1
            if failed_searches >= BUYER_SEARCH_FAILURE_LIMIT:
                logger.info(f"[Node 1B] {company_name}: stopping external people-search after repeated failures")
                break
            await asyncio.sleep(2)

        if not search_blocks:
            logger.info(f"[Node 1B] {company_name}: no search evidence found for buyer contacts")
            return []

        prompt = DISCOVER_BUYER_CONTACTS_PROMPT.format(
            company_name=company_name,
            domain=domain,
            search_results="\n\n".join(search_blocks)[:7000],
        )
        parsed = safe_parse_llm_json(call_llm(prompt, temperature=0.0), context=f"buyer_contacts/{company_name}")
        contacts = _normalize_contact_candidates(parsed)

        @sync_to_async
        def save_contacts() -> List[Dict[str, Any]]:
            company = Company.objects.get(id=tgt["company_id"])
            saved: List[Dict[str, Any]] = []
            for contact in contacts:
                obj = Contact.objects.filter(
                    company=company,
                    contact_name=contact["contact_name"],
                    contact_role=contact["contact_role"],
                ).first()
                if obj is None:
                    obj = Contact.objects.create(
                        company=company,
                        contact_name=contact["contact_name"],
                        contact_role=contact["contact_role"],
                        contact_email=None,
                        linkedin_url=contact.get("linkedin_url"),
                        source_page=contact.get("source_page"),
                    )
                else:
                    changed = False
                    if not obj.linkedin_url and contact.get("linkedin_url"):
                        obj.linkedin_url = contact["linkedin_url"]
                        changed = True
                    if not obj.source_page and contact.get("source_page"):
                        obj.source_page = contact["source_page"]
                        changed = True
                    if changed:
                        obj.save(update_fields=["linkedin_url", "source_page"])

                saved.append({
                    "company_id": company.id,
                    "company_name": company.company_name,
                    "domain": company.domain,
                    "contact_id": obj.id,
                    "contact_name": obj.contact_name,
                    "contact_role": obj.contact_role,
                    "contact_email": obj.contact_email,
                    "linkedin_url": obj.linkedin_url,
                    "source_page": obj.source_page,
                    "confidence": contact.get("confidence", "medium"),
                })
            return saved

        saved_contacts = await save_contacts()
        tgt["buyer_contacts"] = saved_contacts
        if saved_contacts:
            logger.info(
                f"[Node 1B] {company_name} | domain: {domain} | saved {len(saved_contacts)} buyer contacts: "
                f"{_format_contact_summary(saved_contacts)}"
            )
        else:
            logger.info(f"[Node 1B] {company_name} | domain: {domain} | saved 0 buyer contacts")
        return saved_contacts

    role_sem = asyncio.Semaphore(1)

    async def _process_with_sem(tgt: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with role_sem:
            await asyncio.sleep(2)
            return await process_target(tgt)

    results = await asyncio.gather(*[_process_with_sem(tgt) for tgt in target_domains], return_exceptions=True)
    for result in results:
        if isinstance(result, list):
            discovered_contacts.extend(result)

    return {
        **state,
        "target_domains": target_domains,
        "buyer_contacts": discovered_contacts,
    }


async def hunter_enrich_contacts_node(state: AgentState) -> AgentState:
    logger.info("[Node 1C] Enriching buyer contacts with Hunter")

    if not os.getenv("HUNTER_API_KEY"):
        logger.info("[Node 1C] Skipping Hunter enrichment because HUNTER_API_KEY is not set")
        return state

    enriched_contacts: List[Dict[str, Any]] = []
    target_domains = list(state.get("target_domains", []))

    @sync_to_async
    def _load_company_contacts(company_id: int) -> List[Contact]:
        return list(
            Contact.objects.filter(company_id=company_id).order_by("created_at")
        )

    @sync_to_async
    def _save_hunter_contacts(company_id: int, contacts_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        company = Company.objects.get(id=company_id)
        saved_results: List[Dict[str, Any]] = []

        for item in contacts_data:
            email = item.get("contact_email")
            if not email:
                continue

            existing = Contact.objects.filter(company=company, contact_email=email).first()
            if existing is None:
                existing = Contact.objects.filter(
                    company=company,
                    contact_name=item.get("contact_name"),
                    contact_role=item.get("contact_role"),
                ).first()

            if existing is None:
                conflict = Contact.objects.filter(contact_email=email).exclude(company=company).first()
                if conflict:
                    logger.info(f"[Node 1C] Skipping duplicate Hunter email {email} already linked elsewhere")
                    continue
                existing = Contact.objects.create(
                    company=company,
                    contact_name=item.get("contact_name") or "Unknown",
                    contact_role=item.get("contact_role") or "Unknown",
                    contact_email=email,
                    source_page=item.get("source_page"),
                )
            else:
                updates = []
                if not existing.contact_email:
                    conflict = Contact.objects.filter(contact_email=email).exclude(id=existing.id).first()
                    if conflict is None:
                        existing.contact_email = email
                        updates.append("contact_email")
                if item.get("contact_name") and (not existing.contact_name or existing.contact_name == "Unknown"):
                    existing.contact_name = item["contact_name"]
                    updates.append("contact_name")
                if item.get("contact_role") and not existing.contact_role:
                    existing.contact_role = item["contact_role"]
                    updates.append("contact_role")
                if item.get("source_page") and not existing.source_page:
                    existing.source_page = item["source_page"]
                    updates.append("source_page")
                if updates:
                    existing.save(update_fields=updates)

            saved_results.append({
                "company_id": company.id,
                "contact_id": existing.id,
                "contact_name": existing.contact_name,
                "contact_role": existing.contact_role,
                "contact_email": existing.contact_email,
                "linkedin_url": existing.linkedin_url,
                "source_page": existing.source_page,
                "hunter_score": item.get("hunter_score"),
                "hunter_confidence": item.get("hunter_confidence"),
            })

        return saved_results

    async def process_target(tgt: Dict[str, Any]) -> List[Dict[str, Any]]:
        host = urlparse(tgt["domain"]).netloc.lower()
        existing_contacts = await _load_company_contacts(tgt["company_id"])
        existing_results: List[Dict[str, Any]] = []
        for contact in existing_contacts:
            if contact.contact_email:
                existing_results.append({
                    "company_id": tgt["company_id"],
                    "contact_id": contact.id,
                    "contact_name": contact.contact_name,
                    "contact_role": contact.contact_role,
                    "contact_email": contact.contact_email,
                    "linkedin_url": contact.linkedin_url,
                    "source_page": contact.source_page,
                })

        hunter_contacts = await _hunter_find_contacts(host)
        saved_hunter_contacts = await _save_hunter_contacts(tgt["company_id"], hunter_contacts)
        results = existing_results[:]
        seen = {entry.get("contact_id") for entry in results}
        for entry in saved_hunter_contacts:
            if entry.get("contact_id") not in seen:
                seen.add(entry.get("contact_id"))
                results.append(entry)

        tgt["buyer_contacts"] = results
        enriched_count = sum(1 for r in results if r.get("contact_email"))
        if enriched_count:
            logger.info(
                f"[Node 1C] {tgt.get('company_name', host)} | domain: {tgt['domain']} | enriched {enriched_count} contacts: "
                f"{_format_contact_summary(results)}"
            )
        else:
            logger.info(
                f"[Node 1C] {tgt.get('company_name', host)} | domain: {tgt['domain']} | contacts checked: {len(existing_contacts)} | Hunter matched 0 emails"
            )
        return results

    enrich_sem = asyncio.Semaphore(4)

    async def _process_with_sem(tgt: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with enrich_sem:
            return await process_target(tgt)

    result_sets = await asyncio.gather(*[_process_with_sem(tgt) for tgt in target_domains], return_exceptions=True)
    for result in result_sets:
        if isinstance(result, list):
            enriched_contacts.extend(result)

    emails = list(state.get("emails", []))
    for contact in enriched_contacts:
        email = contact.get("contact_email")
        if email and email not in emails:
            emails.append(email)

    return {
        **state,
        "target_domains": target_domains,
        "buyer_contacts": enriched_contacts,
        "emails": emails,
    }


# ──────────────────────────────────────────────────────────────────────────────
# NODE 2A — SCRAPER
# ──────────────────────────────────────────────────────────────────────────────

async def scrape_node(state: AgentState) -> AgentState:
    logger.info(f"[Node 2A] Scraping domains: {[d['domain'] for d in state['target_domains']]}")

    cfg = BrowserConfig(
        headless=True,
        verbose=False,
        extra_args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    )
    crawler_run_cfg = CrawlerRunConfig(
        wait_until="domcontentloaded", 
        page_timeout=60000, 
        semaphore_count=10
    )
    crawl_sem = asyncio.Semaphore(10)

    def _extract_suburls(html: str, base_url: str) -> List[Tuple[str, int]]:
        if not html: return []
        soup = BeautifulSoup(html, "html.parser")
        found: Dict[str, int] = {}
        base_domain = urlparse(base_url).netloc.lower()

        def _add(href: str):
            href = href.strip()
            if href.startswith(('#', 'mailto:', 'javascript:', 'tel:')): return
            absolute = urljoin(base_url, href)
            parsed   = urlparse(absolute)
            if not parsed.scheme or parsed.netloc.lower() != base_domain or absolute.lower().endswith(_SKIP_EXTENSIONS): return
            found[absolute] = max(found.get(absolute, -1), url_priority_score(absolute))

        for a in soup.find_all('a', href=True): _add(a['href'])
        return list(found.items())

    async def _crawl_url(crawler, url: str, depth: int, ds_id: int, comp_id: int, page_label: str = "GENERIC") -> Dict[str, Any]:
        if url.lower().endswith(_SKIP_EXTENSIONS):
            return {"success": False, "suburls": []}

        @sync_to_async
        def get_or_create_chunk():
            chunk, _ = DataChunkProcess.objects.get_or_create(
                url=url, data_source_id=ds_id, defaults={'status': DataChunkProcess.PENDING}
            )
            return chunk.id, chunk.status

        chunk_id, chunk_status = await get_or_create_chunk()
        if chunk_status == DataChunkProcess.READY:
            return {"success": True, "suburls": []}

        crawl_url = url
        host = urlparse(url).netloc.lower()
        result = None
        exc: Optional[Exception] = None
        try:
            result = await crawler.arun(url=crawl_url, config=crawler_run_cfg)
        except Exception as exc:
            exc_text = str(exc)
            if crawl_url.startswith("https://") and "ERR_SSL_PROTOCOL_ERROR" in exc_text:
                crawl_url = "http://" + crawl_url[len("https://"):]
                logger.info(f"[Node 2A] Retrying with HTTP after SSL failure: {url} -> {crawl_url}")
                try:
                    result = await crawler.arun(url=crawl_url, config=crawler_run_cfg)
                except Exception as retry_exc:
                    exc = retry_exc
                    result = None
                else:
                    exc = None

        if exc is not None:
            @sync_to_async
            def mark_exception():
                DataChunkProcess.objects.filter(id=chunk_id).update(
                    status=DataChunkProcess.ERROR,
                    error=str(exc)[:1000],
                )
            await mark_exception()
            return {
                "success": False,
                "suburls": [],
                "failure_reason": str(exc),
                "host": host,
            }

        if not result or not result.success:
            @sync_to_async
            def mark_error():
                DataChunkProcess.objects.filter(id=chunk_id).update(
                    status=DataChunkProcess.ERROR,
                    error=getattr(result, "error_message", None) or "crawl_failed",
                )
            await mark_error()
            return {
                "success": False,
                "suburls": [],
                "failure_reason": getattr(result, "error_message", None) or "crawl_failed",
                "host": host,
            }

        html_content = result.cleaned_html or ""
        raw_text = BeautifulSoup(html_content, "html.parser").get_text(separator=" ", strip=True)

        text_lower = raw_text.lower()
        emails_found = _extract_emails(text_lower)
        phones_found = _extract_phone(raw_text)
        contact_data: dict = {
            "contact_email": _pick_best_email(emails_found),
            "contact_phone": phones_found,
            "page_summary": raw_text[:500],
        }

        should_use_llm = (page_label != "GENERIC") or (depth <= 2)
        if raw_text.strip():
            if should_use_llm:
                for attempt in range(2):
                    try:
                        prompt_content = EXTRACT_CONTACTS_PROMPT.format(content=raw_text[:5000])
                        resp_content = call_llm(prompt_content, temperature=0.0)
                        parsed = safe_parse_llm_json(resp_content, context=f"extract_contacts/{crawl_url}")
                        if isinstance(parsed, dict) and any(
                            k in parsed for k in ["contact_email", "services_offered", "company_products", "ai_signals"]
                        ):
                            if not parsed.get("contact_email"):
                                parsed["contact_email"] = contact_data.get("contact_email")
                            if not parsed.get("contact_phone"):
                                parsed["contact_phone"] = contact_data.get("contact_phone")
                            if not parsed.get("page_summary"):
                                parsed["page_summary"] = contact_data.get("page_summary")
                            contact_data = parsed
                            break
                    except Exception:
                        pass

        @sync_to_async
        def update_db():
            DataChunkProcess.objects.filter(id=chunk_id).update(
                status=DataChunkProcess.READY, result_data=contact_data, 
                website_response_status=str(result.status_code or "200")
            )
            comp = Company.objects.get(id=comp_id)
            if contact_data.get("company_name"): comp.company_name = contact_data["company_name"]
            if contact_data.get("services_offered") and not comp.services_offered: 
                comp.services_offered = contact_data["services_offered"]
            comp.save()

            contact_email = contact_data.get("contact_email")
            contact_name = contact_data.get("contact_name")
            contact_role = contact_data.get("contact_role")

            if contact_email:
                Contact.objects.get_or_create(
                    company=comp, contact_email=contact_email,
                    defaults={
                        'contact_name':  contact_name or "Unknown",
                        'contact_role':  contact_role or "",
                        'source_page':   crawl_url,
                    }
                )
            elif contact_name or contact_role:
                existing = Contact.objects.filter(
                    company=comp,
                    contact_name=contact_name,
                    contact_role=contact_role,
                ).first()
                if existing is None:
                    Contact.objects.create(
                        company=comp,
                        contact_name=contact_name or "Unknown",
                        contact_role=contact_role or "",
                        source_page=crawl_url,
                    )

        await update_db()
        return {"success": True, "suburls": _extract_suburls(html_content, crawl_url), "host": host}

    async def _crawl_with_sem(crawler, url, depth, ds_id, comp_id, label="GENERIC"):
        async with crawl_sem:
            return await _crawl_url(crawler, url, depth, ds_id, comp_id, label)

    async def process_domain(tgt: Dict[str, Any]) -> set:
        start_url = tgt['domain']
        ds_id     = tgt['ds_id']
        comp_id   = tgt['company_id']
        max_urls = MAX_URLS_PER_DOMAIN_DEEP if tgt.get("deep_scrape") else MAX_URLS_PER_DOMAIN
        base_host = urlparse(start_url).netloc.lower()
        visited = {start_url}
        queue: List[Tuple[int, int, str, str]] = []
        success_count = 0
        host_failure_count = 0

        def can_queue(candidate_url: str) -> bool:
            return urlparse(candidate_url).netloc.lower() == base_host and host_failure_count < MAX_HOST_NETWORK_FAILURES

        @sync_to_async
        def mark_crawling():
            Company.objects.filter(id=comp_id).update(crawl_status='crawling')

        await mark_crawling()

        homepage_result = await _crawl_with_sem(crawler, start_url, 0, ds_id, comp_id, "GENERIC")
        if isinstance(homepage_result, dict) and homepage_result.get("success"):
            success_count += 1
        elif isinstance(homepage_result, dict) and _is_network_failure(homepage_result.get("failure_reason", "")):
            host_failure_count += 1
            logger.info(f"[Node 2A] {start_url}: network failure on homepage, host failure count={host_failure_count}")

        for child_url, child_score in homepage_result.get("suburls", []):
            if can_queue(child_url) and child_url not in visited and len(visited) < max_urls:
                visited.add(child_url)
                queue.append((child_score, 1, child_url, "GENERIC"))

        for score, seed_url in build_priority_seed_urls(start_url, include_exploratory=bool(tgt.get("deep_scrape"))):
            if can_queue(seed_url) and seed_url not in visited and len(visited) < max_urls:
                visited.add(seed_url)
                queue.append((score, 1, seed_url, "PRIORITY"))

        while queue and len(visited) < max_urls:
            if host_failure_count >= MAX_HOST_NETWORK_FAILURES:
                logger.info(f"[Node 2A] {start_url}: stopping further crawl after repeated network failures")
                break
            queue.sort(key=lambda x: x[0], reverse=True)
            batch, queue = queue[:10], queue[10:]
            tasks = []
            for score, depth, u, label in batch:
                if not can_queue(u):
                    continue
                if len(visited) + len(tasks) >= max_urls: break
                tasks.append(_crawl_with_sem(crawler, u, depth, ds_id, comp_id, label))
            
            if not tasks: break
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, dict):
                    if res.get("success"):
                        success_count += 1
                    elif _is_network_failure(res.get("failure_reason", "")):
                        host_failure_count += 1
                        logger.info(
                            f"[Node 2A] {start_url}: network failure for {res.get('host') or base_host}, "
                            f"count={host_failure_count}"
                        )
                        if host_failure_count >= MAX_HOST_NETWORK_FAILURES:
                            break
                    for child_url, child_score in res.get("suburls", []):
                        if can_queue(child_url) and child_url not in visited and len(visited) < max_urls:
                            visited.add(child_url)
                            queue.append((child_score, depth + 1, child_url, "GENERIC"))
            if host_failure_count >= MAX_HOST_NETWORK_FAILURES:
                logger.info(f"[Node 2A] {start_url}: halting queue expansion after repeated network failures")
                break

        @sync_to_async
        def finalize_company():
            Company.objects.filter(id=comp_id).update(crawl_status='done' if success_count else 'failed')

        await finalize_company()
        return visited

    if not CRAWLER_AVAILABLE:
        logger.error("[Node 2A] crawl4ai not available")
        return state

    crawler = AsyncWebCrawler(config=cfg)
    await crawler.start()
    try:
        await asyncio.gather(*[process_domain(tgt) for tgt in state.get('target_domains', [])], return_exceptions=True)
    finally:
        await crawler.close()

    return state


# ──────────────────────────────────────────────────────────────────────────────
# NODE 2B — AI GAP ANALYSIS
# ──────────────────────────────────────────────────────────────────────────────

async def ai_gap_analysis_node(state: AgentState) -> AgentState:
    logger.info("[Node 2B] Starting AI Gap Analysis Node")
    @sync_to_async
    def get_companies_to_analyze():
        comp_ids = [t['company_id'] for t in state.get('target_domains', [])]
        return list(Company.objects.filter(id__in=comp_ids))

    companies = await get_companies_to_analyze()
    target_map = {t["company_id"]: t for t in state.get("target_domains", [])}
    
    for c in companies:
        try:
            logger.info(f"[Node 2B] Analyzing {c.company_name}")
            tgt = target_map.get(c.id, {})

            @sync_to_async
            def get_chunks():
                return list(
                    DataChunkProcess.objects.filter(data_source_id=tgt.get("ds_id"), status=DataChunkProcess.READY)
                    .order_by("-updated_at")[:20]
                )

            chunks = await get_chunks()
            page_signals = _collect_page_signals(chunks)

            if page_signals.get("page_summaries") or c.services_offered:
                score_prompt = AI_SCORE_PROMPT.format(
                    domain=c.domain,
                    keyword=state["keyword"],
                    context=_build_score_context(
                        state["keyword"],
                        c.domain,
                        "",
                        company=c,
                        page_signals=page_signals,
                    ),
                )
                score_resp_content = call_llm(score_prompt, temperature=0.0)
                rescored_data = safe_parse_llm_json(score_resp_content, context=f"rescore/{c.company_name}") or {}
            else:
                rescored_data = {}

            products = _normalize_string_list(rescored_data.get("company_products")) or page_signals.get("company_products", [])
            current_ai_usage = _normalize_string_list(rescored_data.get("current_ai_usage")) or page_signals.get("current_ai_usage", [])
            services_needed = _normalize_string_list(rescored_data.get("services_needed_from_us")) or page_signals.get("services_needed_from_us", [])

            prompt = AI_GAP_ANALYSIS_PROMPT.format(
                company_name=c.company_name,
                industry=rescored_data.get("industry") or c.industry or "Unknown",
                services_offered=c.services_offered or "Unknown",
                company_products=", ".join(products) or "Unknown",
                current_ai_usage=", ".join(current_ai_usage) or "Unknown",
                services_needed_from_us=", ".join(services_needed) or "Unknown",
            )
            resp_content = call_llm(prompt, temperature=0.3)
            analysis_data = safe_parse_llm_json(resp_content, context=f"gaps/{c.company_name}") or {}
            
            @sync_to_async
            def save_analysis():
                final_services_needed = _normalize_string_list(analysis_data.get("services_needed_from_us")) or services_needed
                c.industry = rescored_data.get("industry") or c.industry
                c.ai_score = _coerce_int(rescored_data.get("ai_score"), c.ai_score)
                if rescored_data:
                    c.ai_score_reasoning = _serialize_score_reasoning(rescored_data)

                if not c.services_offered and page_signals.get("page_summaries"):
                    c.services_offered = page_signals["page_summaries"][0]

                gaps = analysis_data.get("ai_gaps_detected", "Potential manual processes")
                recommendations = analysis_data.get("ai_recommendations", "Custom AI integration")

                if products:
                    gaps += f"\nProducts observed: {', '.join(products[:6])}."
                if current_ai_usage:
                    gaps += f"\nCurrent AI usage: {', '.join(current_ai_usage[:6])}."
                if final_services_needed:
                    recommendations += f"\nBest services to pitch: {', '.join(final_services_needed[:6])}."

                c.ai_gaps_detected = gaps
                c.ai_recommendations = recommendations
                c.save()

            await save_analysis()
        except Exception as e:
            logger.error(f"[Node 2B] Failed to analyze {c.company_name}: {e}")

    return state


# ──────────────────────────────────────────────────────────────────────────────
# NODE 3 — OUTREACH
# ──────────────────────────────────────────────────────────────────────────────

async def outreach_node(state: AgentState) -> AgentState:
    logger.info("[Node 3] Starting Outreach Emails Node")

    @sync_to_async
    def get_contacts():
        comp_ids = [t['company_id'] for t in state.get('target_domains', [])]
        return list(
            Contact.objects.filter(
                company_id__in=comp_ids,
                company__do_not_contact=False,
                contact_email__isnull=False,
            ).select_related('company')
        )

    contacts = await get_contacts()

    for c in contacts:
        try:
            @sync_to_async
            def already_actioned() -> bool:
                return Outreach.objects.filter(contact=c, company=c.company).exists()

            if await already_actioned():
                continue

            prompt = DRAFT_EMAIL_PROMPT.format(
                company_name=c.company.company_name,
                contact_name=c.contact_name or "there",
                contact_role=c.contact_role or "your team",
                industry=c.company.industry or "",
                services_offered=c.company.services_offered or "",
                ai_gaps=c.company.ai_gaps_detected or "",
                ai_recs=c.company.ai_recommendations or ""
            )
            resp_content = call_llm(prompt, temperature=0.7)
            email_data = safe_parse_llm_json(resp_content, context=f"outreach/{c.contact_email}")

            if not isinstance(email_data, dict) or not email_data.get("subject"):
                continue

            @sync_to_async
            def save_outreach():
                Outreach.objects.create(
                    contact=c,
                    company=c.company,
                    status='drafted',
                    email_subject=email_data.get("subject", "Connecting"),
                    email_body=email_data.get("body", ""),
                )

            await save_outreach()
            logger.info(f"[Node 3] Outreach drafted for {c.contact_email}")

        except Exception as e:
            logger.error(f"[Node 3] Failed for {c.contact_email}: {e}")

    return state


# ──────────────────────────────────────────────────────────────────────────────
# Pipeline
# ──────────────────────────────────────────────────────────────────────────────

def build_pipeline():
    workflow = StateGraph(AgentState)
    workflow.add_node("research", research_node)
    workflow.add_node("discover_buyer_contacts", discover_buyer_contacts_node)
    workflow.add_node("scrape",   scrape_node)
    workflow.add_node("hunter_enrich_contacts", hunter_enrich_contacts_node)
    workflow.add_node("ai_gap_analysis", ai_gap_analysis_node)
    workflow.add_node("outreach", outreach_node)
    
    workflow.add_edge(START, "research")
    workflow.add_edge("research", "discover_buyer_contacts")
    workflow.add_edge("discover_buyer_contacts", "scrape")
    workflow.add_edge("scrape", "hunter_enrich_contacts")
    workflow.add_edge("hunter_enrich_contacts", "ai_gap_analysis")
    workflow.add_edge("ai_gap_analysis", "outreach")
    workflow.add_edge("outreach", END)
    
    return workflow.compile()


async def execute_pipeline(keyword: str):
    import django
    if not django.apps.apps.ready:
        django.setup()

    app = build_pipeline()
    initial_state: AgentState = {
        "keyword":        keyword,
        "target_domains": [],
        "scraped_urls":   [],
        "emails":         [],
        "companies":      [],
        "buyer_contacts": [],
    }

    logger.info("====================================")
    logger.info(f"STARTING PIPELINE for keyword: {keyword}")

    try:
        async for output in app.astream(initial_state):
            for node_name in output:
                logger.info(f"--- Completed Node: {node_name} ---")
    except Exception as e:
        logger.error(f"PIPELINE FAILED: {e}", exc_info=True)

    logger.info("PIPELINE ENDED")
    logger.info("====================================")
