# Zenemoo URL Shortener — Cloudflare Worker Deployment & Operations Guide

## 1. Overview
The Zenemoo URL Shortener is a production-grade, admin-only link redirection gateway built on **Cloudflare Workers** and **Workers KV**. It is designed to operate 100% within Cloudflare's free-tier limits while providing sub-millisecond edge redirection, temporary caching protection, zero open-redirect vulnerabilities, and complete isolation from the main Zenemoo database.

---

## 2. Capacity & Free-Tier Quota Model

| Quota Dimension | Cloudflare Free Limit | Zenemoo Planned Usage (20k Users/Mo) | Free Quota Headroom |
| :--- | :--- | :--- | :--- |
| **Worker Requests** | 100,000 / day | ~1,000 - 3,000 / day | **97%+ Headroom** |
| **KV Read Operations** | 100,000 / day | ~1,000 - 3,000 / day (1 per redirect) | **97%+ Headroom** |
| **KV Write Operations** | 1,000 / day | ~100 / day (3,000 new links / month) | **90%+ Headroom** |
| **KV Delete Operations** | 1,000 / day | ~5 - 10 / day | **99%+ Headroom** |
| **KV Storage Capacity** | 1 GB total | ~3.5 MB / year (~1 KB per record) | **99.6%+ Headroom** |

> **Critical Free-Tier Safeguard**:
> The redirect worker **never** executes a KV write on individual redirect hits. Doing so would exhaust the 1,000 writes/day free limit during traffic spikes. Redirect click metrics are maintained via zero-cost edge telemetry / bounded aggregation, keeping the operating cost at $0.00.

---

## 3. Step-by-Step Setup Checklist

### Step 3.1 — Create the Workers KV Namespace
In your local terminal, navigate to the worker folder or workspace root and run:

```bash
# 1. Create production KV namespace
npx wrangler kv:namespace create SHORTENER_KV

# Expected Output:
# Add the following to your configuration file in your kv_namespaces array:
# [[kv_namespaces]]
# binding = "SHORTENER_KV"
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 2. (Optional) Create preview namespace for local development
npx wrangler kv:namespace create SHORTENER_KV --preview
```

### Step 3.2 — Configure `wrangler.toml`
Open `cloudflare-workers/zenemoo-url-shortener/wrangler.toml` and update the `id` and `preview_id` values:

```toml
name = "zenemoo-url-shortener"
main = "src/index.js"
compatibility_date = "2024-01-01"
account_id = "c3e84d8a84eaa06c632f189765eaa9c6"

[[kv_namespaces]]
binding = "SHORTENER_KV"
id = "YOUR_ACTUAL_PRODUCTION_KV_ID_HERE"
preview_id = "YOUR_ACTUAL_PREVIEW_KV_ID_HERE"

[vars]
PRODUCTION_DOMAIN = "https://zenemoo.in"
CORS_ORIGIN = "https://zenemoo.in,https://www.zenemoo.in,http://localhost:5173,http://localhost:3000,http://localhost:5000"
ENABLE_CLICK_TRACKING = "true"
```

### Step 3.3 — Backend Environment Variables
Add the following variable to your backend deployment environment (`backend/.env` / Render environment dashboard):

```env
# Cloudflare Credentials for Server-Side Link Management
CLOUDFLARE_ACCOUNT_ID=c3e84d8a84eaa06c632f189765eaa9c6
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_with_kv_edit_permissions
CLOUDFLARE_SHORTENER_KV_ID=YOUR_ACTUAL_PRODUCTION_KV_ID_HERE
SHORTENER_BASE_DOMAIN=https://zenemoo.in
```

*(Note: In local development, if Cloudflare KV is not configured, the backend automatically uses its built-in resilient local storage in `backend/scratch/shortener_links.json` without failing).*

---

## 4. Testing Before Connecting Production Routes

### Local Verification
```bash
# 1. Test worker unit suite (Mock KV & redirect behavior)
cd "cloudflare-workers/zenemoo-url-shortener"
node testWorker.js

# 2. Test backend RBAC and API endpoints
cd "../../backend"
node src/scripts/testUrlShortener.js
```

### Staging / Workers Dev Verification
Deploy the worker to `workers.dev` first before attaching your custom domain:

```bash
cd "cloudflare-workers/zenemoo-url-shortener"
npx wrangler deploy
```

Verify the live worker URL:
```bash
# Health Check
curl https://zenemoo-url-shortener.zenemootech.workers.dev/health

# Test 404 Response
curl -i https://zenemoo-url-shortener.zenemootech.workers.dev/l/unknown123
```

---

## 5. Connecting the Narrowest Safe Production Route

To preserve all existing Zenemoo features, the worker route must **only** capture the narrow path `/l/*`:

### Via Cloudflare Dashboard:
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select the domain **`zenemoo.in`**.
3. In the sidebar, navigate to **Workers Routes** (under *Compute & Workers*).
4. Click **Add Route** and enter:
   - **Route**: `zenemoo.in/l/*`
   - **Worker**: `zenemoo-url-shortener`
5. Repeat for www subdomain:
   - **Route**: `www.zenemoo.in/l/*`
   - **Worker**: `zenemoo-url-shortener`

> **Note on Safety**:
> This route pattern only matches paths starting with `/l/` (e.g. `https://zenemoo.in/l/meet26`). It will **never** intercept website pages, API calls (`/api/*`), portal routes (`/portal/*`), or static assets.

---

## 6. Rollback Procedure

If you ever need to temporarily or permanently disconnect the redirect worker:

1. **Immediate Decoupling**: In the Cloudflare Dashboard under **Workers Routes**, disable or delete the routes `zenemoo.in/l/*` and `www.zenemoo.in/l/*`. Changes take effect globally within 15 seconds.
2. **Worker Deletion (Optional)**:
   ```bash
   npx wrangler delete --name zenemoo-url-shortener
   ```
3. Existing short link metadata remains preserved in the KV namespace and backend storage.
