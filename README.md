# LaTeX Resumes

A single-page, desktop-first site that shares three LaTeX resume templates. Visitors can preview each template in a modal, copy the LaTeX source to their clipboard, and paste it straight into Overleaf.

**New:** Upload your existing résumé (PDF, DOCX, or TXT) and the AI will fill any template with your real information — ready to paste into Overleaf.

Live site: `https://latex-resumes.vercel.app`

## What's included

- `index.html` — semantic page structure and content
- `styles.css` — design system, glassmorphism, motion, responsive fallbacks, AI modal styles
- `script.js` — modal, clipboard copy, hero stack cycling, AI autofill, EmailJS feedback form, donate button, scroll reveal
- `assets/previews/` — preview PNGs for the three templates
- `assets/templates/` — `.tex` source files for the three templates
- `api/generate.js` — Vercel serverless function that proxies the NVIDIA LLM API, verifies Turnstile, and enforces per-IP rate limits
- `vercel.json` — Vercel routing/headers
- `package.json` — project metadata
- `.env.example` — list of all required environment variables

## Run locally

Open `index.html` directly in a browser, or serve with a local static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

> Note: the **Copy Code** buttons fetch the `.tex` files with `fetch()`. This works on Vercel (HTTPS, same-origin) and on `localhost`. Opening `index.html` with the `file://` protocol may cause the fetch to fail because of browser security restrictions — use a local server if you want to test copying locally.

## Deploy to Vercel

This site is hosted on **Vercel** (not GitHub Pages) so it can use the secure `/api/generate` serverless function.

### 1. Get API keys

1. **NVIDIA API key** — create a free key at [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys) (starts with `nvapi-`).
2. **Cloudflare Turnstile** — create a widget in the Cloudflare dashboard to get a **site key** (public) and **secret key** (server-side).
3. **Rate-limit store** — create a free [Upstash Redis](https://upstash.com/) database (or enable Vercel KV) and copy the REST URL + token.

### 2. Configure environment variables

Copy `.env.example` to `.env` for local testing, then add the same values to the **Vercel dashboard** under Project Settings → Environment Variables.

| Variable | Required | Where it is used |
|----------|----------|------------------|
| `NVIDIA_API_KEY` | Yes | Server (`api/generate.js`) |
| `TURNSTILE_SECRET_KEY` | Yes | Server (`api/generate.js`) |
| `UPSTASH_REDIS_REST_URL` | Recommended | Server rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Server rate limit |
| `VERCEL_KV_REST_API_URL` | Optional | Alternative to Upstash |
| `VERCEL_KV_REST_API_TOKEN` | Optional | Alternative to Upstash |
| `TURNSTILE_SITE_KEY` | Yes | Client (`index.html` Turnstile widget) |

Paste the **Turnstile site key** into the `data-sitekey` attribute of the `#ai-turnstile` div in `index.html`.

### 3. Import and deploy

1. Import the `latex-resumes` repo into [Vercel](https://vercel.com/).
2. Add all environment variables from `.env.example`.
3. Deploy. Vercel will serve `index.html` at the root and `/api/generate` for the AI endpoint.

### 4. Update links

- In `index.html`, replace the LinkedIn placeholder `#` with your real LinkedIn URL.
- Turn off GitHub Pages if it was previously enabled; the live URL is now `https://latex-resumes.vercel.app`.

## AI autofill

Each template card has an **Autofill with AI** button. The flow is:

1. User uploads a PDF, DOCX, or TXT résumé (≤ 5 MB).
2. Text is extracted in the browser (PDF.js / Mammoth.js / FileReader).
3. Extracted text + chosen template + Turnstile token are sent to `/api/generate`.
4. The server verifies Turnstile, checks the per-IP rate limit, loads the blank `.tex` template, and asks the NVIDIA LLM to fill it using only information from the résumé.
5. The filled LaTeX is returned and stored client-side; the **Copy Code** button changes to **Custom Code Ready — Copy Code** and copies the AI-generated version.
6. A **Use blank template** link reverts the card to the original template.

## Security notes

- The NVIDIA API key (`nvapi-…`) must **only** exist as a Vercel environment variable. It never appears in client files, bundles, or response bodies.
- Résumé text is not logged or stored by the serverless function.
- Turnstile is verified server-side before any NVIDIA API call.
- Per-IP rate limiting prevents abuse of the free generation endpoint.

## Making the GitHub repo private

After the site is successfully deployed on Vercel, you can make the GitHub repo private without affecting the live site.

> **Important:** On GitHub's free plan, a private repository cannot serve a GitHub Pages site. Flipping the repo private while still relying on GitHub Pages will take the live site offline. Because the site is now hosted on Vercel, the private visibility has no effect on the deployment.

1. Make sure the latest deploy on Vercel is live and working.
2. In the GitHub repo, go to **Settings → General**.
3. Scroll down to **Danger Zone** and click **Change repository visibility**.
4. Choose **Make private** and confirm.
5. Return to the Vercel dashboard and verify the project still has access and that the latest deploy is live.

If any secrets were ever committed (they shouldn't be — all keys should live only in Vercel environment variables), rotate them after going private.

## TODOs for the owner

1. **Stripe donation link** — in `script.js`, replace `STRIPE_PAYMENT_LINK` with your Stripe Payment Link URL.
2. **LinkedIn URL** — in `index.html`, replace the LinkedIn placeholder `#` with your actual LinkedIn URL.
3. **Turnstile site key** — in `index.html`, add your public Cloudflare Turnstile site key to the `data-sitekey` attribute.
4. **EmailJS template variables** — confirm the `name="from_name"`, `name="reply_to"`, and `name="message"` attributes in `index.html` match the variables in your EmailJS template `template_jsji0pk`. Rename them in one place if needed.

## Credits

Made by **Roli Vela**.

Templates are free to use and adapt.
