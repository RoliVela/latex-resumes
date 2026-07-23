# Build Prompt — "LaTeX Resumes" website (DESKTOP version)

> This is the complete brief for building the **desktop / large-screen version** of a
> personal project website. A separate follow-up prompt will handle the phone layout, so
> **build desktop-first**, but do not hard-break on small screens — let it degrade
> gracefully (content stays readable, nothing overlaps) even though mobile polish comes later.

---

## 0. Role & quality bar

You are a senior front-end engineer **and** a graphic designer. The owner (Roli Vela) will
put this on his professional portfolio and link it from a LinkedIn post, so it must look
**intentionally designed — not "vibe-coded."** That means:

- A real, consistent design system (spacing scale, type scale, one accent, defined shadows
  and blur values) — not random values sprinkled per element.
- Restraint. One accent color family. No rainbow buttons, no clashing gradients, no
  emoji-as-icons, no default purple-on-white "AI gradient" hero.
- Deliberate hierarchy, contrast, balance, and alignment (apply real graphic-design
  principles). Everything on an 8px grid. Optical alignment over mathematical when they
  conflict.
- Motion that feels engineered: smooth, purposeful, subtle. No bouncing, no confetti, no
  gratuitous parallax.

If a choice would look like a template or a generic AI landing page, choose the more
restrained, editorial option instead.

---

## 1. What the site is

A single-page site that shares **three LaTeX resume templates** (anonymized, with
`[PLACEHOLDER]` fields) so anyone can copy the LaTeX source into Overleaf and build their
own resume. The three templates:

1. **Undergraduate Resume**
2. **Graduate Resume**
3. **Roli Resume** (the owner's personal hybrid)

Core user flow: land → read why LaTeX resumes matter and how to use them in Overleaf →
scroll to the three templates → **View Template** (opens an image preview in a modal, NOT a
new tab) → close → **Copy Code** (copies that template's LaTeX to the clipboard) → paste
into Overleaf.

Plus a **Donate** section (Stripe — placeholder for now) and a **Feedback** section
(EmailJS — fully wired).

---

## 2. Tech constraints

- **Static site, plain HTML + CSS + JavaScript. No frameworks, no build step, no bundler.**
  It must run by opening `index.html` and deploy as-is to **GitHub Pages** (repo:
  `latex-resumes`, so the live URL will be `https://rolivela.github.io/latex-resumes/`).
- Vanilla JS only. The single allowed third-party script is the **EmailJS browser SDK**
  (loaded from its CDN). Everything else is hand-written.
- No `localStorage`/`sessionStorage` needed; keep state in memory.
- Use system-font stack or a **single** high-quality web font loaded from Google Fonts
  (see typography). Do not load multiple font families.
- Keep it accessible: semantic HTML, keyboard-operable modal and buttons, visible focus
  states, `alt` text, sufficient contrast (WCAG AA).
- Prefers-reduced-motion: honor it — disable non-essential animations when the user has it set.

### File structure
```
latex-resumes/
├── index.html
├── styles.css
├── script.js
├── assets/
│   ├── previews/
│   │   ├── undergraduate.png
│   │   ├── graduate.png
│   │   └── roli.png
│   └── templates/
│       ├── undergraduate.tex
│       ├── graduate.tex
│       └── roli.tex
└── README.md
```
> The `previews/*.png` and `templates/*.tex` files are provided — do not generate them.
> Wire the UI to these exact paths.

---

## 3. Design system

### 3.1 Aesthetic
Light, warm, **glassmorphic**, premium. Think editorial/product-marketing polish: warm
beige/off-white canvas, frosted-glass surfaces with soft depth, one confident **indigo**
accent, and slow, subtle motion.

### 3.2 Color tokens (define as CSS custom properties)
Warm neutral base + indigo accent. Suggested palette — keep these relationships, tune if you
can improve harmony:

```
--bg:            #F3EEE7   /* warm beige canvas */
--bg-2:          #ECE4D9   /* slightly deeper beige for subtle gradient/section shift */
--surface:       rgba(255, 253, 250, 0.65)   /* glass panel fill */
--surface-solid: #FBF8F3   /* solid card fallback / non-glass surfaces */
--border-glass:  rgba(255, 255, 255, 0.55)   /* top/left glass highlight border */
--border-hair:   rgba(40, 30, 20, 0.10)      /* hairline dividers */
--text:          #211C16   /* near-black warm ink */
--text-soft:     #5C5248   /* secondary text */
--text-faint:    #8A7F72   /* captions / tertiary */
--accent:        #4F46E5   /* indigo 600 */
--accent-2:      #7C6BF0   /* indigo/violet for gradient partner */
--accent-ink:    #3730A3   /* darker indigo for text-on-light accents */
--success:       #2E9E6B   /* copy-confirm green */
--accent-grad:   linear-gradient(135deg, #4F46E5 0%, #7C6BF0 100%)
```
Use the indigo gradient sparingly and with purpose (primary buttons, one hero accent, thin
highlight lines) — never as a full-page background.

### 3.3 Glassmorphism spec (apply to cards, modal, nav, section panels)
- Fill: `var(--surface)`; `backdrop-filter: blur(16px) saturate(140%)` (with
  `-webkit-` prefix). Provide a solid fallback (`--surface-solid`) via
  `@supports not (backdrop-filter: blur(1px))`.
- Border: 1px `var(--border-glass)` — a subtle light edge that reads as a glass rim.
- Radius: 20px on large panels/cards, 14px on buttons/inputs, 24px on the modal.
- Shadow (layered, soft, warm — not harsh black):
  `0 1px 2px rgba(33,28,22,.04), 0 8px 24px rgba(33,28,22,.08), 0 24px 48px rgba(33,28,22,.06)`.
- Optional inner highlight: `inset 0 1px 0 rgba(255,255,255,.6)` for the top-lit glass look.
- Keep glass legible: never put low-contrast text on a busy area behind glass.

### 3.4 Typography
- Load ONE font. Recommended: **"Instrument Sans"** or **"General Sans"** or **"Inter"** for
  UI (pick one clean geometric-humanist sans). Optionally pair with a display weight of the
  same family for headings — do NOT introduce a second family.
- Type scale (desktop): hero H1 ~64px / tight line-height (1.05) / letter-spacing -0.02em;
  section H2 ~34px; card title ~22px; body ~17–18px / line-height 1.6; captions ~14px.
- Headings weight 600–700; body 400–450. Generous line length cap (~66ch) for reading text.

### 3.5 Spacing & layout
- 8px spacing scale (8/16/24/32/48/64/96/128).
- Max content width ~1200px, centered, with comfortable side gutters.
- Sections separated by large vertical rhythm (96–128px) so it breathes.
- Subtle background interest: a very soft warm-to-beige vertical gradient on the page, plus
  1–2 large, blurred, low-opacity indigo "glow" blobs positioned behind the hero and the
  templates section (decorative, `pointer-events:none`, low opacity ~0.12). These give the
  glass something to refract without looking like a default gradient hero. Keep them tasteful.

### 3.6 Motion system
- Global easing: `cubic-bezier(0.22, 1, 0.36, 1)` (smooth, slightly springy-out) for
  transforms; 180–260ms for interactive feedback, 500–700ms for entrances.
- **Scroll-reveal:** sections and cards fade + rise ~16px into place as they enter the
  viewport (IntersectionObserver; stagger the three cards by ~80ms). Reveal once, don't
  re-hide.
- **Hover (buttons):** slight lift (`translateY(-2px)`) + shadow deepen; **active/press:**
  `scale(0.98)`.
- **Hover (cards):** gentle lift (`translateY(-4px)`), shadow grows, glass border brightens
  slightly. Smooth, small.
- **Ambient:** the hero glow blobs drift/breathe very slowly (20–30s loops, small movement).
  Barely perceptible. Disable under `prefers-reduced-motion`.
- **Modal:** fade the backdrop in; the panel scales from ~0.96 → 1 and fades in (~220ms).
  Reverse on close.
- No motion should ever block or delay a user action.

---

## 4. Page structure & content (top → bottom)

A slim sticky top nav is optional; if included, make it a thin glass bar with the site
wordmark left ("LaTeX Resumes" or "Resume Templates") and anchor links (About · Templates ·
Support · Feedback) right. Keep it minimal.

### 4.1 HERO / About (top of page)
Purpose: explain why LaTeX resumes matter, why Roli built this, and how to use the templates
in Overleaf. Then invite the user to scroll to the templates.

Use this copy (final — the owner has approved wording pending his review; keep meaning, you
may lightly adjust for layout):

**Eyebrow:** `LATEX RESUME TEMPLATES`

**H1:** `Resumes that actually get read.`

**Subhead:**
> Three clean, recruiter-ready LaTeX resume templates — free to copy, easy to edit in
> Overleaf, no LaTeX experience required.

**Body (2 short paragraphs):**
> Until I got to college, I had no idea how to build a real resume — I was putting
> everything I'd ever done onto one page. Since then I've spent a lot of time learning what
> actually goes into a strong one: structure, hierarchy, and formatting that a recruiter can
> scan in seconds. Along the way I picked up LaTeX, and it changed how my resumes looked and
> held up.
>
> It matters for more than looks. A cleanly structured, single-column LaTeX resume exports a
> reliable text layer, so applicant tracking systems tend to parse it the way you intended —
> instead of scrambling a heavily formatted Word export. I put together three versions I use
> myself and I'm sharing them here in case they help you too.

**Primary CTA button:** `View the templates` → smooth-scrolls to the templates section.
**Secondary (text/ghost) link:** `How to use them` → smooth-scrolls to the how-to block.

Compose the hero as a balanced editorial layout (not centered-everything). Consider an
asymmetric two-column: text left, and on the right a **tasteful visual** — e.g. a
glassmorphic "stack" of the three resume previews fanned/offset with soft shadows, subtly
tilted, hinting at what's below. This doubles as the engaging hero graphic. Build it from the
provided preview PNGs; keep it elegant, not cluttered.

### 4.2 HOW TO USE (Overleaf) — just below the hero
A glass panel titled **"How to use these in Overleaf"** with a clean numbered sequence
(design as an elegant step list / horizontal stepper, not plain `<ol>`):

1. **Create a free Overleaf account** — no cost, no install.
2. **Start a new blank project.**
3. **Paste in the template code** (copied from a card below).
4. **It compiles automatically.** Hit **Recompile** to preview the PDF.
5. **Edit in the visual editor** — replace the `[bracketed]` placeholders with your info.
   No coding needed. Recompile after each change to see updates.
6. **Download your PDF** using the download button at the top left when it looks right.

Keep icons minimal and consistent if used (simple line icons or numbered chips in glass).

### 4.3 TEMPLATES — three side-by-side cards
Heading: **"The templates"** with a one-line intro:
> Pick the one that fits where you are. Preview it, copy the code, and make it yours.

Three **equal-height glass cards in a single row** (CSS grid, `1fr 1fr 1fr`, ~24–32px gap).
Each card contains, top→bottom:

- **Card title** (e.g. "Undergraduate Resume").
- **A short description** (final copy below).
- A small **preview thumbnail** (the provided PNG, `object-fit: cover` top-crop or a neat
  framed thumbnail) — optional but encouraged for visual richness; keep all three identical
  in treatment.
- Two stacked (or side-by-side) buttons:
  - **View Template** (secondary/ghost glass button) → opens the **image modal** (§5.1).
  - **Copy Code** (primary indigo/gradient button) → copies that template's `.tex` (§5.2).

**Card descriptions (final):**

- **Undergraduate Resume**
  > Best for high schoolers and students early in their college careers. A clean,
  > single-column layout that keeps limited experience looking organized and intentional —
  > with room for education, skills, first jobs, projects, and campus involvement.

- **Graduate Resume**
  > Built for students with deeper research, project, and professional experience. Adds a
  > summary and a dual-education section, with more space to show technical depth across work
  > and projects.

- **Roli Resume**
  > The one I actually use. A hybrid of the undergraduate and graduate formats that I've
  > found works best for job applications — balanced across experience, projects, and
  > leadership, and shaped around what fit me personally.

Card → template mapping:
| Card | Preview image | LaTeX source |
|------|---------------|--------------|
| Undergraduate Resume | `assets/previews/undergraduate.png` | `assets/templates/undergraduate.tex` |
| Graduate Resume | `assets/previews/graduate.png` | `assets/templates/graduate.tex` |
| Roli Resume | `assets/previews/roli.png` | `assets/templates/roli.tex` |

### 4.4 SUPPORT / DONATE section
A glass panel. Left: heading **"Support this project"** + the owner's message (final,
verbatim):
> Hey, Roli here. I just want to thank you so much for using this software and hope you've
> gotten some use out of the templates. Making websites is something I thoroughly enjoy, but
> it's honestly very time-consuming. If you'd like to donate, I'd greatly appreciate it and
> would put it toward making great content like this. Have an amazing day (:

Right (or below): a clear primary **"Donate"** button.

**Stripe is a placeholder for now.** Implement the button as a clearly-marked placeholder:
```js
// TODO(Roli): replace with your Stripe Payment Link URL.
const STRIPE_PAYMENT_LINK = ""; // e.g. "https://buy.stripe.com/xxxxxxxx"
```
On click: if `STRIPE_PAYMENT_LINK` is set, open it in a new tab (`rel="noopener"`); if empty,
show a small inline note like "Donations coming soon — thank you!" (do NOT throw, do NOT
open a broken link). Leave an obvious comment block explaining exactly where Roli pastes his
Stripe Payment Link later. The button must already look final and styled.

### 4.5 FEEDBACK section (EmailJS — fully wired)
A glass panel titled **"Send feedback"** with a short line:
> Found a bug, have a suggestion, or just want to say hi? Send it my way.

Form fields (glass inputs, indigo focus ring):
- **Name** (text, required)
- **Email** (email, required, validated)
- **Message** (textarea, required)
- **Send** button (primary).

Wire with the **EmailJS browser SDK v4** (CDN). Credentials (all public, safe client-side):
```js
const EMAILJS_PUBLIC_KEY  = "z0Vx2xEyRH8wEg62N";
const EMAILJS_SERVICE_ID   = "service_xjnpxk2";
const EMAILJS_TEMPLATE_ID   = "template_jsji0pk";
```
Implementation notes:
- Initialize: `emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });`
- Send via `emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, formEl)` OR
  `emailjs.send(...)` with a params object.
- **Template variable names:** the form field `name` attributes must match the variables in
  Roli's EmailJS template. Use `from_name`, `reply_to`, and `message` as the field `name`s,
  AND leave a clearly commented block listing the exact variables used so Roli can confirm
  they match his `template_jsji0pk` template (and rename in one place if not). Example:
  ```html
  <!-- These input name= attributes MUST match the {{variables}} in EmailJS template
       template_jsji0pk. Adjust here if your template uses different names. -->
  <input name="from_name" ...>   <!-- {{from_name}} -->
  <input name="reply_to" ...>    <!-- {{reply_to}} (the sender's email) -->
  <textarea name="message" ...>  <!-- {{message}} -->
  ```
- UX: on submit → disable button + show a subtle loading state → on success show an inline
  glass success toast ("Thanks — your message is on its way.") and reset the form → on error
  show a non-alarming inline error ("Something went wrong — please try again or email me
  directly."). **Never use `alert()`/`confirm()`** (blocking dialogs). Prevent default form
  submit. Basic client-side validation before sending.

### 4.6 FOOTER
Thin glass footer:
- **"Made by Roli Vela"** (name required).
- GitHub link: `https://github.com/RoliVela` (known — include it).
- LinkedIn link: use `[ROLI_LINKEDIN_URL]` placeholder with a `TODO` comment for Roli to
  fill in (do not invent a URL).
- Small print line: "Templates are free to use and adapt." Year auto-filled with JS is fine
  (but note: the environment may restrict `Date.now()`; if so, hardcode the year — keep it
  simple).
- Keep it quiet and clean. (Per the owner: the thank-you to Starra lives on LinkedIn, NOT on
  the site — do not add it here.)

---

## 5. Key interactions (exact behavior)

### 5.1 View Template modal (image preview — NEVER a new tab)
- Clicking **View Template** opens a centered modal overlay on the **same page**.
- Backdrop: dark, semi-transparent, blurred (`backdrop-filter: blur(6px)`), fades in.
- Panel: glass, radius 24px, holds the resume **preview image** (the provided PNG) scaled to
  fit — `max-height: 90vh`, width auto, letter-page aspect preserved, and **scrollable if the
  image is taller than the viewport** so the whole resume is viewable.
- A caption/title above the image ("Undergraduate Resume — preview").
- Close affordances (all of them): an **X button**, clicking the **backdrop**, and the
  **Esc** key.
- **Focus management:** trap focus within the modal while open, return focus to the
  triggering button on close, set `aria-modal="true"` + `role="dialog"` + a labelled title.
- Lock body scroll while open. One reusable modal that swaps in the correct image per card
  (don't build three separate modals).
- Absolutely no `window.open` / new tab / new window for previews.

### 5.2 Copy Code (clipboard)
- Clicking **Copy Code** copies that template's **full LaTeX source** to the clipboard.
- Load each `.tex` via `fetch('assets/templates/<name>.tex')` (same-origin on GitHub Pages —
  works). Cache the fetched text after first load. Use `navigator.clipboard.writeText(text)`.
- Provide a **fallback**: if `navigator.clipboard` is unavailable or fails, use a hidden
  `<textarea>` + `document.execCommand('copy')`; if that also fails, surface a small inline
  message telling the user to open the `.tex` link manually (no blocking alert).
- **Feedback:** the button briefly transforms to a success state — swap label to
  "Copied!" with a check, tint with `--success`, ~1.8s, then revert. Smooth transition, no
  layout shift (reserve width). This mirrors the clean copy-confirm pattern the owner likes.
- Make the fetch resilient: if a `.tex` fails to load, the button shows "Couldn't load —
  try again" rather than silently doing nothing.

---

## 6. "Not vibe-coded" checklist (the bar to hit)
- [ ] Consistent 8px spacing everywhere; nothing visually misaligned.
- [ ] Exactly one font family; one accent (indigo) family; glass treatment identical across
      all surfaces.
- [ ] Real type hierarchy — hero, section, card, body, caption are clearly distinct.
- [ ] Three template cards are perfectly equal height and aligned, buttons baseline-aligned.
- [ ] Shadows are soft, warm, layered — never a single harsh black drop shadow.
- [ ] Motion is subtle and consistent (shared easing/durations); reduced-motion respected.
- [ ] No emoji used as UI icons; if icons are used they're a single consistent line set (or
      clean inline SVGs).
- [ ] Focus states are visible and attractive (indigo ring), keyboard fully works.
- [ ] No console errors; no broken image/tex paths; no blocking `alert()` anywhere.
- [ ] Looks like a designed product page, not a bootstrap template or an AI default.

## 7. Acceptance criteria
1. Opening `index.html` (and the deployed GitHub Pages URL) renders the full page with all
   sections, no console errors, all three previews and `.tex` files wired to the correct
   paths.
2. **View Template** opens an in-page modal with the correct preview image, closes via X /
   backdrop / Esc, traps focus, and never opens a new tab.
3. **Copy Code** copies the correct full LaTeX source and shows the "Copied!" confirmation;
   pasting into Overleaf yields the exact template.
4. **Feedback** form validates and sends via EmailJS using the provided IDs, with inline
   success/error states and no blocking dialogs.
5. **Donate** button is styled and final-looking, wired to the `STRIPE_PAYMENT_LINK`
   placeholder with clear TODO for later.
6. Footer shows "Made by Roli Vela" + GitHub, with LinkedIn placeholder.
7. Passes the §6 checklist. Desktop-first; on smaller widths it still reads without overlap
   (full mobile polish is a later prompt).
8. Clean, commented, well-organized code (`index.html`, `styles.css`, `script.js`) that a
   human can read and maintain — this is a portfolio piece, so code quality counts too.

## 8. Deliverables
- The four code files plus `README.md` (short: what it is, how to run, how to deploy to
  GitHub Pages, and where the TODOs are — Stripe link, LinkedIn URL, EmailJS template var
  check).
- Do not modify the provided `assets/`.
- Provide the code ready to `git push` to the `latex-resumes` repo with Pages enabled on the
  root of the default branch.
