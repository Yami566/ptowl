# PtOwl Infrastructure Pricing Comparison (March 2026)

## Assumptions per user tier

| Metric | Per User |
|--------|----------|
| API requests/day | 50 |
| Data stored | 5 MB |
| Page load size | 100 KB |
| Page loads/day (est.) | 10 |

| Tier | Users | API req/mo | Storage | Bandwidth/mo |
|------|-------|-----------|---------|-------------|
| MVP | 10 | 15,000 | 50 MB | 30 MB |
| Early | 100 | 150,000 | 500 MB | 300 MB |
| Scaling | 1,000 | 1,500,000 | 5 GB | 3 GB |
| Mature | 10,000 | 15,000,000 | 50 GB | 30 GB |
| Enterprise | 100,000 | 150,000,000 | 500 GB | 300 GB |

---

## 1. Cloudflare (Workers + Pages + D1) — CURRENT STACK

### Free Tier
| Service | Limit |
|---------|-------|
| Workers | 100,000 req/day (~3M/mo), 10ms CPU/req |
| Pages | Unlimited bandwidth, unlimited static requests, 500 builds/mo |
| D1 | 5M rows read/day, 100K rows written/day, 5 GB storage |

### Paid Tier ($5/mo Workers subscription)
| Service | Included | Overage |
|---------|----------|---------|
| Workers | 10M req/mo, 30M CPU-ms/mo | $0.30/M requests, $0.02/M CPU-ms |
| Pages | Unlimited bandwidth & requests | — |
| D1 | 25B rows read/mo, 50M rows written/mo, 5 GB | $0.001/M rows read, $1.00/M rows written, $0.75/GB |

### Estimated Monthly Cost

| Tier | Users | Est. Cost | Notes |
|------|-------|-----------|-------|
| MVP | 10 | **$0** | Well within free tier (15K req/mo << 3M/mo free) |
| Early | 100 | **$0** | Still within free tier (150K req/mo << 3M/mo free) |
| Scaling | 1,000 | **$5** | Hits paid tier but within included 10M req/mo |
| Mature | 10,000 | **$5 - $7** | 15M req/mo slightly over 10M included (+$1.50 overage) |
| Enterprise | 100,000 | **$47 - $60** | 150M req/mo = 140M overage ($42) + storage overage |

---

## 2. AWS (Lambda + DynamoDB + S3 + CloudFront)

### Free Tier (12 months, then some always-free)
| Service | Limit |
|---------|-------|
| Lambda | 1M req/mo, 400K GB-sec/mo (always free) |
| DynamoDB | 25 GB storage, 25 RCU/25 WCU provisioned (always free) |
| S3 | 5 GB storage, 20K GET, 2K PUT/mo (12 months) |
| CloudFront | 1M requests/mo, 100 GB transfer/mo (always free) |

### Pay-as-you-go Pricing
| Service | Unit | Cost |
|---------|------|------|
| Lambda requests | per 1M | $0.20 |
| Lambda compute (x86) | per GB-second | $0.0000166667 |
| Lambda compute (Arm) | per GB-second | $0.0000133334 |
| DynamoDB reads (on-demand) | per 1M RRU | $0.25 |
| DynamoDB writes (on-demand) | per 1M WRU | $1.25 |
| DynamoDB storage | per GB/mo | $0.25 |
| S3 storage | per GB/mo | $0.023 |
| S3 GET requests | per 1K | $0.0004 |
| S3 PUT requests | per 1K | $0.005 |
| CloudFront transfer | per GB (US) | $0.085 |
| CloudFront requests | per 10K HTTPS | $0.01 |

### Estimated Monthly Cost

| Tier | Users | Est. Cost | Notes |
|------|-------|-----------|-------|
| MVP | 10 | **$0** | Within free tier |
| Early | 100 | **$0 - $1** | Mostly within free tier |
| Scaling | 1,000 | **$3 - $8** | Lambda free covers 1M; DynamoDB reads/writes small |
| Mature | 10,000 | **$20 - $40** | 15M Lambda req ($2.80), DynamoDB ($5-15), CF ($2-3), S3 ($1) |
| Enterprise | 100,000 | **$150 - $300** | 150M Lambda ($30), DynamoDB ($50-100), CF ($25), S3 ($12) |

**Downsides:** Complex billing across 4+ services, cold starts (~100-500ms), no built-in auth, requires more DevOps expertise.

---

## 3. Vercel + Neon (Postgres)

### Free Tier
| Service | Limit |
|---------|-------|
| Vercel Hobby | 1M invocations/mo, 100 GB bandwidth, 4 hrs CPU/mo |
| Neon Free | 0.5 GB storage, 100 CU-hours/mo compute |

### Paid Tier
| Service | Cost | Included |
|---------|------|----------|
| Vercel Pro | $20/user/mo | 10M edge req, 1 TB bandwidth, $0.60/M invocations overage |
| Neon Launch | ~$15/mo typical | $0.106/CU-hr compute, $0.35/GB storage |

### Estimated Monthly Cost

| Tier | Users | Est. Cost | Notes |
|------|-------|-----------|-------|
| MVP | 10 | **$0** | Free tiers cover it |
| Early | 100 | **$0** | Still within free tier |
| Scaling | 1,000 | **$20 - $35** | Vercel Pro ($20) + Neon Launch (~$15) |
| Mature | 10,000 | **$35 - $60** | Vercel Pro + Neon compute scales |
| Enterprise | 100,000 | **$200 - $500** | Vercel invocation overages + Neon Scale plan |

**Downsides:** $20/user/mo for team seats adds up fast, vendor lock-in on deployment, Neon free tier very small (0.5 GB).

---

## 4. Supabase (Postgres + Auth + Edge Functions + Storage)

### Free Tier
| Service | Limit |
|---------|-------|
| Database | 500 MB storage |
| Bandwidth | 5 GB/mo |
| Auth | 50,000 MAU |
| Edge Functions | 500K invocations/mo |
| File Storage | 1 GB |

### Pro Plan ($25/mo per organization)
| Service | Included | Overage |
|---------|----------|---------|
| Database | 8 GB/project | $0.125/GB |
| Bandwidth | 250 GB/mo | $0.09/GB |
| Auth | 100K MAU | $0.00325/MAU |
| Edge Functions | 2M invocations | $2/M invocations |
| File Storage | 100 GB | $0.021/GB |

### Estimated Monthly Cost

| Tier | Users | Est. Cost | Notes |
|------|-------|-----------|-------|
| MVP | 10 | **$0** | Free tier covers everything |
| Early | 100 | **$0** | Free tier still sufficient |
| Scaling | 1,000 | **$25** | Pro plan needed for 5 GB storage |
| Mature | 10,000 | **$25 - $60** | Pro plan + storage overage ($5-10) |
| Enterprise | 100,000 | **$100 - $300** | Auth overage + storage + bandwidth |

**Downsides:** Supabase Edge Functions run on Deno (not Node/Workers), database is shared Postgres (can be noisy-neighbor on free), phone auth requires external provider (Twilio etc), less flexible than raw Workers.

---

## 5. Firebase (Firestore + Cloud Functions + Hosting + Phone Auth)

### Free Tier (Spark Plan)
| Service | Limit |
|---------|-------|
| Firestore reads | 50K/day |
| Firestore writes | 20K/day |
| Firestore storage | 1 GB |
| Cloud Functions | 2M invocations/mo, 400K GB-sec/mo |
| Hosting | 10 GB storage, 360 MB/day transfer |
| Phone Auth MAU | 0-49,999 free |
| Phone Auth SMS | ~300 free/mo (10/day) |

### Blaze Plan (Pay-as-you-go)
| Service | Unit | Cost |
|---------|------|------|
| Firestore reads | per 100K | $0.036 |
| Firestore writes | per 100K | $0.108 |
| Firestore storage | per GB/mo | $0.108 |
| Cloud Functions invocations | per 1M | $0.40 |
| Cloud Functions compute | per GB-sec | $0.0000025 |
| Hosting bandwidth | per GB | $0.15 |
| Phone Auth SMS (US) | per SMS | $0.01 |
| Phone Auth SMS (intl) | per SMS | $0.01 - $0.45 |

### Estimated Monthly Cost

| Tier | Users | Est. Cost | Notes |
|------|-------|-----------|-------|
| MVP | 10 | **$0 + ~$0** | Free tier; SMS cost negligible |
| Early | 100 | **$0 - $5** | Mostly free; ~$1 SMS if US |
| Scaling | 1,000 | **$15 - $40** | Firestore reads ($5-10), functions ($0.60), SMS ($7-10) |
| Mature | 10,000 | **$80 - $200** | Firestore reads ($50-80), SMS ($70-100), hosting ($5) |
| Enterprise | 100,000 | **$700 - $2,000** | Firestore reads scale badly ($500-800), SMS ($700-1000) |

**Downsides:** Firestore reads are EXPENSIVE at scale, SMS costs add up linearly, Cloud Functions have cold starts, vendor lock-in to Google, NoSQL only.

---

## Firebase Phone Auth Cost (applies to ANY stack using it)

This is relevant because PtOwl currently uses Firebase Phone Auth regardless of backend.

| Tier | Users | Logins/mo (est. 4/user) | SMS Cost (US $0.01) | MAU Cost |
|------|-------|------------------------|---------------------|----------|
| MVP | 10 | 40 | **$0** (under 300 free) | **$0** |
| Early | 100 | 400 | **$1.00** | **$0** |
| Scaling | 1,000 | 4,000 | **$37** | **$0** |
| Mature | 10,000 | 40,000 | **$397** | **$0** |
| Enterprise | 100,000 | 400,000 | **$3,997** | **$275** |

**Note:** SMS costs are the most expensive line item at scale. Consider alternatives at 10K+ users:
- WhatsApp OTP (cheaper in many regions)
- Email magic links (essentially free)
- Passkeys/WebAuthn (free, no SMS)
- Cloudflare Turnstile + email (free)

---

## Summary Comparison Table

### Monthly cost by tier (USD, estimated)

| Tier | Cloudflare (current) | AWS Full Stack | Vercel + Neon | Supabase | Firebase |
|------|---------------------|----------------|---------------|----------|----------|
| **10 users** | **$0** | $0 | $0 | $0 | $0 |
| **100 users** | **$0** | $0-1 | $0 | $0 | $0-5 |
| **1K users** | **$5** | $3-8 | $20-35 | $25 | $15-40 |
| **10K users** | **$5-7** | $20-40 | $35-60 | $25-60 | $80-200 |
| **100K users** | **$47-60** | $150-300 | $200-500 | $100-300 | $700-2,000 |

*Add Firebase Phone Auth SMS costs to any non-Firebase stack: ~$0 (10 users) to ~$4,000 (100K users)*

### Verdict

| Criterion | Winner | Runner-up |
|-----------|--------|-----------|
| **Cheapest at MVP** | Tie (all free) | — |
| **Cheapest at 1K users** | **Cloudflare ($5)** | AWS ($3-8) |
| **Cheapest at 10K users** | **Cloudflare ($5-7)** | AWS ($20-40) |
| **Cheapest at 100K users** | **Cloudflare ($47-60)** | Supabase ($100-300) |
| **Simplest to manage** | **Cloudflare** | Supabase |
| **Best free tier** | **Cloudflare** | Firebase |
| **Most scalable** | **AWS** | Cloudflare |
| **Best built-in auth** | **Supabase** | Firebase |
| **Lowest latency** | **Cloudflare** (edge) | Vercel (edge) |
| **Biggest cost risk** | Firebase (Firestore reads + SMS) | AWS (bill surprise) |

### Recommendation for PtOwl

**Stay on Cloudflare.** It is the cheapest option at every scale tier, has the most generous free tier, and the current stack (Workers + Pages + D1) is already deployed and working. The only significant cost at scale is Firebase Phone Auth SMS, which is independent of the backend infrastructure choice.

**Action items for cost optimization:**
1. **Now:** No changes needed. Free tier covers MVP/beta.
2. **At 1K users:** Upgrade to $5/mo Workers paid plan. Total cost: ~$42/mo (including SMS).
3. **At 10K users:** Evaluate replacing Firebase Phone Auth with email magic links or passkeys to eliminate ~$400/mo SMS costs.
4. **At 100K users:** Phone Auth strategy is the #1 cost driver (~$4K/mo). Infrastructure stays cheap (~$50-60/mo on Cloudflare).
