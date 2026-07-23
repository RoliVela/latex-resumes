# LaTeX Resumes

A single-page, desktop-first site that shares three LaTeX resume templates. Visitors can preview each template in a modal, copy the LaTeX source to their clipboard, and paste it straight into Overleaf.

Live site: `https://rolivela.github.io/latex-resumes/`

## What's included

- `index.html` — semantic page structure and content
- `styles.css` — design system, glassmorphism, motion, responsive fallbacks
- `script.js` — modal, clipboard copy, EmailJS feedback form, donate button, scroll reveal
- `assets/previews/` — preview PNGs for the three templates
- `assets/templates/` — `.tex` source files for the three templates

## Run locally

Open `index.html` directly in a browser, or serve with a local static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

> Note: the **Copy Code** buttons fetch the `.tex` files with `fetch()`. This works on GitHub Pages (HTTPS, same-origin) and on `localhost`. Opening `index.html` with the `file://` protocol may cause the fetch to fail because of browser security restrictions — use a local server if you want to test copying locally.

## Deploy to GitHub Pages

1. Create a repo named `latex-resumes` on GitHub.
2. Push all files in this folder to the default branch root.
3. In repo settings, enable **Pages** → deploy from the root of the default branch.
4. Visit `https://rolivela.github.io/latex-resumes/`.

## TODOs for the owner

1. **Stripe donation link** — in `script.js`, replace `STRIPE_PAYMENT_LINK` with your Stripe Payment Link URL.
2. **LinkedIn URL** — in `index.html`, replace `[ROLI_LINKEDIN_URL]` with your actual LinkedIn URL.
3. **EmailJS template variables** — confirm the `name="from_name"`, `name="reply_to"`, and `name="message"` attributes in `index.html` match the variables in your EmailJS template `template_jsji0pk`. Rename them in one place if needed.

## Credits

Made by **Roli Vela**.

Templates are free to use and adapt.
