# Perplexity Pro Audit Prompt for ptowl.com

**Instructions:** Copy the entire prompt below and paste it into Perplexity Pro. The prompt is structured to extract maximum actionable findings across security, performance, accessibility, compliance, and UX.

---

## Prompt (Copy Everything Below This Line)

```
You are performing a comprehensive third-party audit of the web application at https://ptowl.com — a SaaS PT (Physical Therapy) schedule generator built on Cloudflare Pages + Workers + D1. The application is live with real users onboarding. Analyze the following areas and provide specific, actionable findings with severity ratings (Critical/High/Medium/Low/Info).

## 1. Security Audit

### HTTP Headers
- Check all HTTP security headers by visiting https://ptowl.com and inspecting response headers. Specifically verify:
  - Content-Security-Policy (CSP) — should be restrictive with explicit source lists
  - Strict-Transport-Security (HSTS) — should be max-age=63072000 with includeSubDomains and preload
  - X-Frame-Options — should be DENY
  - X-Content-Type-Options — should be nosniff
  - Referrer-Policy — should be strict-origin-when-cross-origin
  - Permissions-Policy — should disable camera, microphone, geolocation, payment
- Use SecurityHeaders.com or similar to grade the headers

### TLS Configuration
- Check TLS certificate validity and issuer (should be Cloudflare)
- Verify TLS 1.2+ only (no TLS 1.0 or 1.1)
- Check cipher suite strength
- Use SSLLabs.com grade if available

### API Security
- Check https://ptowl.com/api/v1/health — should return { ok: true }
- Check for information leakage on error responses (e.g., stack traces, internal paths)
- Verify CORS headers on API responses (should only allow https://ptowl.com origin)
- Check if API endpoints expose server version or framework information
- Try accessing https://ptowl.com/api/v1/admin/users without auth — should return 401

### Cookie Security
- Check Set-Cookie headers for:
  - HttpOnly flag (must be present on auth tokens)
  - Secure flag (must be present)
  - SameSite attribute (should be Lax or Strict)
  - Domain scoping

### Bot Protection
- Check for Cloudflare Turnstile integration (look for challenges.cloudflare.com references)
- Verify reCAPTCHA or Turnstile on login/registration pages

### Source Map Exposure
- Check if source maps are accessible (e.g., .js.map files) — they should NOT be in production

## 2. Performance Audit

### Core Web Vitals
- Check CrUX (Chrome User Experience Report) data for ptowl.com if available
- Run a Lighthouse-equivalent analysis and report scores for:
  - Performance (target: 90+)
  - Accessibility (target: 90+)
  - Best Practices (target: 90+)
  - SEO (target: 90+)
- Report specific metrics: LCP, FID/INP, CLS, FCP, TTFB

### Asset Optimization
- Check if JavaScript is code-split (should have multiple chunk files)
- Check if CSS is minimized
- Verify gzip or brotli compression on responses
- Check CDN caching headers (Cache-Control, ETag) on static assets
- Verify no render-blocking resources in the critical path

### Bundle Analysis
- Estimate total JavaScript bundle size
- Check for large dependencies that could be tree-shaken or lazy-loaded
- Verify lazy loading of route-level code chunks

## 3. Accessibility Audit (WCAG 2.1 AA)

### Visual
- Check color contrast ratios (the app uses green #2d6a4f and orange #e76f51 on white/dark backgrounds)
- Verify text is readable at 200% zoom
- Check for color-only information indicators (should have text/icon alternatives)

### Keyboard
- Verify all interactive elements are reachable via Tab key
- Check for visible focus indicators
- Verify Escape closes modals
- Check for keyboard traps (modals should trap focus correctly)

### Screen Reader
- Check for skip-to-main-content link
- Verify all images have alt text
- Check form inputs have associated labels
- Verify ARIA roles on dynamic content (modals, overlays, notifications)
- Check heading hierarchy (h1 → h2 → h3, no skipped levels)

### Forms
- Verify error messages are associated with their fields (aria-describedby)
- Check autocomplete attributes on email/password fields
- Verify required fields are indicated both visually and programmatically

## 4. SEO Audit

### Meta Tags
- Check <title> tag (should be descriptive, <60 characters)
- Check <meta name="description"> (should be present, <160 characters)
- Check OpenGraph tags (og:title, og:description, og:image, og:url)
- Check Twitter Card tags (twitter:card, twitter:title, twitter:description)

### Technical SEO
- Check for robots.txt at https://ptowl.com/robots.txt
- Check for sitemap.xml at https://ptowl.com/sitemap.xml
- Verify canonical URLs on all pages
- Check for proper heading hierarchy (single h1 per page)
- Verify mobile-friendliness (responsive design, viewport meta tag)
- Check for structured data / JSON-LD (schema.org)

### Indexability
- Check if login-gated content is properly excluded from indexing
- Verify public pages (/privacy, /terms, /security) are indexable
- Check for duplicate content issues

## 5. Compliance Assessment

### HIPAA
- The application is for Physical Therapists. Assess whether it appears to store or transmit Protected Health Information (PHI).
- NOTE: The app uses a "sports alias" system — patient initials (e.g., "LJ") are mapped to sports figure names (e.g., "LeBron James") instead of storing real patient names. Assess whether this constitutes adequate de-identification under HIPAA Safe Harbor.
- Check if any API responses or page content could leak PHI
- Assess whether the application would be considered a Business Associate under HIPAA

### GDPR
- Check for cookie consent mechanism (required for EU users)
- Verify privacy policy link is accessible from all pages
- Check if privacy policy mentions: data collection, storage, sharing, deletion rights
- Verify data deletion rights are mentioned AND actionable

### CCPA
- Check for California-specific privacy disclosures
- Verify "Do Not Sell My Personal Information" link if applicable
- Check for opt-out mechanisms

### ADA (Americans with Disabilities Act)
- Assess web accessibility compliance risk based on WCAG 2.1 AA findings
- Note any patterns that could trigger ADA litigation (common in healthcare)

## 6. UX/UI Assessment

### First Impressions
- Evaluate the landing/login page professional appearance
- Does it look trustworthy for a healthcare application?
- Is the value proposition clear within 5 seconds?

### Registration/Login Flow
- How many steps to create an account?
- Is Google Sign-In prominent and functional?
- Are error messages helpful and specific?
- Is there a clear loading state during authentication?

### Mobile Experience
- Test at 375px width (iPhone SE)
- Test at 768px width (iPad)
- Check touch target sizes (minimum 44x44px)
- Verify no horizontal scrolling

### Error Handling
- What happens when you visit a non-existent page? (e.g., /nonexistent)
- Are API errors displayed gracefully to users?
- Is there a clear path back to safety from error states?

## 7. Infrastructure Assessment

### Hosting & CDN
- Confirm hosting on Cloudflare (check response headers: cf-ray, cf-cache-status)
- Verify CDN is serving static assets from edge locations
- Check for any exposed server software versions

### DNS
- Check DNSSEC status for ptowl.com
- Check CAA records (Certificate Authority Authorization)
- Verify MX records for email delivery
- Check SPF, DKIM, DMARC records for email authentication

### SSL/TLS
- Verify certificate is valid and not expiring soon
- Check certificate chain completeness
- Verify OCSP stapling

## Output Format

For each finding, provide:
- **Area**: Which audit section (Security, Performance, Accessibility, SEO, Compliance, UX, Infrastructure)
- **Severity**: Critical / High / Medium / Low / Info
- **Finding**: What you observed (specific, with evidence)
- **Recommendation**: Specific fix or improvement action
- **Reference**: Relevant standard (OWASP, WCAG 2.1, HIPAA, GDPR, etc.)

## Summary Section

After all findings, provide:
1. **Overall Grades:**
   - Security: A-F
   - Performance: A-F
   - Accessibility: A-F
   - SEO: A-F
   - Compliance: A-F

2. **Top 5 Priorities** to address immediately (ranked by risk × impact)

3. **Comparison** to industry standards for healthcare SaaS applications

4. **What's done well** — acknowledge strong security practices and good architecture decisions

5. **90-day action plan** — prioritized list of improvements grouped by effort (quick wins, medium effort, major projects)
```

---

## How to Use This Prompt

1. Go to [perplexity.ai](https://perplexity.ai) and select Pro mode
2. Paste the entire prompt above (everything inside the code block)
3. Perplexity will analyze ptowl.com and provide a comprehensive audit report
4. Save the output as `docs/PERPLEXITY-AUDIT-RESULTS.md` for reference
5. Cross-reference findings with the VALIDATION-CHECKLIST.md to prioritize fixes

## What to Do With the Results

| Finding Severity | Action |
|-----------------|--------|
| Critical | Fix immediately (same day) |
| High | Fix within 1 week |
| Medium | Add to next sprint backlog |
| Low | Add to tech debt backlog |
| Info | Document and acknowledge |

---

*This prompt was designed to extract maximum actionable information from Perplexity Pro's research capabilities. Update the prompt if the application's architecture or features change significantly.*
