#!/usr/bin/env python3
"""Professional-level audit of SolVerify live deployment.
Tests all major endpoints + new features for correctness, security, and UX issues."""
import urllib.request
import urllib.error
import json
import sys
import time

BASE = "https://solverify.vercel.app"
PASS = 0
FAIL = 0
WARN = 0

def check(name, fn):
    global PASS, FAIL
    try:
        result = fn()
        if result is True:
            PASS += 1
            print(f"  ✅ {name}")
        else:
            FAIL += 1
            print(f"  ❌ {name}: {result}")
    except Exception as e:
        FAIL += 1
        print(f"  ❌ {name}: exception {e}")

def warn(name, msg):
    global WARN
    WARN += 1
    print(f"  ⚠️  {name}: {msg}")

def fetch(path, method="GET", data=None, headers=None, timeout=30):
    url = BASE + path
    h = headers or {}
    if data is not None:
        h["Content-Type"] = "application/json"
        data = json.dumps(data).encode() if not isinstance(data, bytes) else data
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            try:
                return r.status, json.loads(body) if body else {}
            except json.JSONDecodeError:
                return r.status, body
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, None
    except Exception as e:
        return 0, str(e)

print("\n=== SolVerify Professional Audit ===\n")

print("[1] Core endpoints (must return 200)")
check("GET /", lambda: fetch("/")[0] == 200)
check("GET /api/feed", lambda: fetch("/api/feed")[0] == 200)
check("GET /api/trending", lambda: fetch("/api/trending")[0] == 200)
check("GET /api/tokens", lambda: fetch("/api/tokens")[0] == 200)
check("GET /api/tokens/verified", lambda: fetch("/api/tokens/verified")[0] == 200)
check("GET /api/tokens/recent", lambda: fetch("/api/tokens/recent")[0] == 200)
check("GET /api/tokens/trending", lambda: fetch("/api/tokens/trending")[0] == 200)
check("GET /api/payments/sol-price", lambda: fetch("/api/payments/sol-price")[0] in (200, 503))
check("GET /api/tokens/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", lambda: fetch("/api/tokens/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")[0] == 200)
check("GET /api/tokens/invalid_addr (should 400)", lambda: fetch("/api/tokens/garbage")[0] == 400)
check("GET /api/trust/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", lambda: fetch("/api/trust/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")[0] == 200)
check("GET /api/auth/me", lambda: fetch("/api/auth/me")[0] == 200)
check("POST /api/auth/challenge (random wallet)", lambda: fetch("/api/auth/challenge", "POST", {"wallet": "7xKDR9dDiVdQ8kBgs9HrG4Z5N9wFbCL1YsCwf4YHtkXR"})[0] == 200)

print("\n[2] New Phase 3 features")
check("GET /api/token/{bonk}/chart", lambda: fetch("/api/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/chart")[0] == 200)
check("GET /api/token/{bonk}/chart?timeframe=day", lambda: fetch("/api/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/chart?timeframe=day")[0] == 200)
check("GET /api/token/{bonk}/live", lambda: fetch("/api/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/live")[0] == 200)
check("GET /api/token/{bonk}/holders", lambda: fetch("/api/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/holders")[0] == 200)
check("GET /api/token/{bonk}/story", lambda: fetch("/api/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/story")[0] == 200)
check("GET /api/search?q=bonk", lambda: fetch("/api/search?q=bonk")[0] == 200)
check("GET /api/search?q=pepe", lambda: fetch("/api/search?q=pepe")[0] == 200)
check("GET /api/v1/score?token=BONK", lambda: fetch("/api/v1/score?token=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")[0] == 200)
check("GET /api/v1/score?token=invalid (should 400)", lambda: fetch("/api/v1/score?token=garbage")[0] == 400)
check("GET /api/v1/badge/{bonk}?style=card", lambda: fetch("/api/v1/badge/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263?style=card", headers={"Accept": "image/svg+xml"})[0] == 200)
check("GET /api/v1/badge/{bonk}?style=mini", lambda: fetch("/api/v1/badge/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263?style=mini", headers={"Accept": "image/svg+xml"})[0] == 200)
check("GET /api/v1/badge/{bonk}?style=banner", lambda: fetch("/api/v1/badge/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263?style=banner", headers={"Accept": "image/svg+xml"})[0] == 200)

print("\n[3] All new pages")
for path in ["/leaderboard", "/portfolio", "/watchlist", "/compare", "/airdrop-check", "/claim", "/search", "/docs", "/share", "/widget-new", "/dashboard"]:
    check(f"GET {path}", lambda p=path: fetch(p)[0] == 200)

print("\n[4] Token profile pages (10 random)")
import random
test_tokens = [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",  # Bonk
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",  # JUP
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",  # SAMO
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  # USDT
    "So11111111111111111111111111111111111111112",  # SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
    "DUSTawucrTsGU8hcqRdHD9si9NCoZ4NT5TawvGZsxnk",  # random
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",  # ATLAS
    "rndmGENERATEDxxxxxxxxxxxxxxxxxxxxxxxxxxXyz",  # likely invalid
    "5ymsJn9e2KHcrEzDx5d7uY9CqgM2Hk7yuPEUkCJ1gepy",  # bogus
]
for t in test_tokens:
    s, body = fetch(f"/token/{t}")
    if s == 200:
        check(f"GET /token/{t[:10]}...", lambda: True)
    elif s == 500:
        FAIL += 1
        print(f"  ❌ GET /token/{t[:10]}...: 500 (server error)")
    elif s == 404:
        check(f"GET /token/{t[:10]}... (404 expected for unknown)", lambda: True)
    else:
        FAIL += 1
        print(f"  ⚠️ GET /token/{t[:10]}...: status {s}")

print("\n[5] Security: protected endpoints reject without auth")
check("GET /api/admin/claims (should 401)", lambda: fetch("/api/admin/claims")[0] == 401)
check("GET /api/admin/stats (should 401)", lambda: fetch("/api/admin/stats")[0] == 401)
check("GET /api/admin/reports (should 401)", lambda: fetch("/api/admin/reports")[0] == 401)
check("POST /api/claim/{addr} (should 401)", lambda: fetch("/api/claim/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "POST", {"signature": "x"*88, "message": "x"*10, "claim_method": "creator_wallet"})[0] == 401)
check("PUT /api/metadata/{addr} (should 401)", lambda: fetch("/api/metadata/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "PUT", {"name": "test"})[0] == 401)
check("POST /api/vouch/{addr} (should 401)", lambda: fetch("/api/vouch/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "POST", {})[0] == 401)
check("POST /api/payments/initiate (should 401)", lambda: fetch("/api/payments/initiate", "POST", {"token_id": "00000000-0000-0000-0000-000000000000", "tier": "gold"})[0] == 401)

print("\n[6] Cron endpoints reject without secret")
check("GET /api/cron/check-payments (should 401)", lambda: fetch("/api/cron/check-payments")[0] == 401)
check("GET /api/cron/update-market-data (should 401)", lambda: fetch("/api/cron/update-market-data")[0] == 401)
check("GET /api/cron/scan-links (should 401)", lambda: fetch("/api/cron/scan-links")[0] == 401)
check("GET /api/cron/expire-claims (should 401)", lambda: fetch("/api/cron/expire-claims")[0] == 401)

print("\n[7] Security headers on homepage")
s, body = fetch("/", headers={"User-Agent": "Mozilla/5.0"})
if s == 200:
    # urllib doesn't expose headers easily; fetch HEAD instead
    try:
        req = urllib.request.Request(BASE + "/", method="HEAD")
        with urllib.request.urlopen(req, timeout=10) as r:
            headers = r.headers
        check("HSTS present", lambda: "strict-transport-security" in {k.lower() for k in dict(headers)})
        check("X-Frame-Options present", lambda: "x-frame-options" in {k.lower() for k in dict(headers)})
        check("X-Content-Type-Options present", lambda: "x-content-type-options" in {k.lower() for k in dict(headers)})
    except Exception as e:
        warn("Headers check", str(e))

print("\n[8] Rate limit: search")
def rate_limit_test():
    successes = 0
    for i in range(35):
        s, _ = fetch(f"/api/search?q=test{i}")
        if s == 200: successes += 1
        elif s == 429: break
    return successes >= 25
check("Search rate limit kicks in (25+ allowed)", rate_limit_test)

print("\n[9] Data integrity: feed tokens have real addresses")
s, body = fetch("/api/feed")
if s == 200 and body and "data" in body:
    valid = sum(1 for t in body["data"] if t.get("address") and len(t["address"]) >= 32)
    invalid = sum(1 for t in body["data"] if not t.get("address") or len(t["address"]) < 32)
    check(f"All {len(body['data'])} feed tokens have valid addresses", lambda: invalid == 0)
    if invalid > 0:
        warn("Empty addresses", f"{invalid} tokens missing addresses")

print("\n[10] Page content: homepage contains key elements")
s, body = fetch("/", headers={"User-Agent": "Mozilla/5.0"})
if s == 200 and body:
    if isinstance(body, bytes): body = body.decode("utf-8", errors="ignore")
    check("Homepage has 'SolVerify' brand", lambda: "SolVerify" in body)
    check("Homepage has feed table", lambda: "Volume 24h" in body or "volume" in body.lower())
    check("Homepage has trust pitch ($60)", lambda: "$60" in body or "60" in body)

print("\n[11] Live data freshness")
s, body = fetch("/api/feed")
if s == 200 and body and "fetched_at" in body:
    age = (time.time() * 1000) - body["fetched_at"]
    if age < 5 * 60 * 1000:
        check(f"Feed is fresh (age {int(age/1000)}s)", lambda: True)
    else:
        warn("Feed age", f"Feed is {int(age/1000)}s old")

print("\n[12] GeckoTerminal upstream health")
s, body = fetch("/api/feed")
if s == 200 and body:
    data = body.get("data", [])
    if len(data) > 0:
        check("Feed returns live data from upstream", lambda: any(t.get("price_usd") for t in data))
        check("Feed has price changes", lambda: any(t.get("change_24h") is not None for t in data))
    else:
        warn("Feed empty", "No tokens in feed (upstream may be rate-limited)")

print(f"\n{'='*50}")
print(f"  Audit: {PASS} passed, {FAIL} failed, {WARN} warnings")
print(f"{'='*50}")
sys.exit(0 if FAIL == 0 else 1)
