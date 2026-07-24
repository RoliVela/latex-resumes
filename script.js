/*
  LaTeX Resumes — Interactions
  Vanilla JS. No frameworks. Served via Vercel (static + /api serverless functions).

  TODO(Roli):
  1. Replace STRIPE_PAYMENT_LINK with your Stripe Payment Link URL.
  2. Replace [ROLI_LINKEDIN_URL] in index.html with your LinkedIn URL.
  3. Confirm EmailJS template variables match the input name= attributes in index.html.
  4. Add your Cloudflare Turnstile site key to the data-sitekey attribute in index.html.
*/

(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Config
     ------------------------------------------------------------------ */
  const EMAILJS_PUBLIC_KEY = 'z0Vx2xEyRH8wEg62N';
  const EMAILJS_SERVICE_ID = 'service_xjnpxk2';
  const EMAILJS_TEMPLATE_ID = 'template_jsji0pk';

  // TODO(Roli): replace with your Stripe Payment Link URL.
  const STRIPE_PAYMENT_LINK = ''; // e.g. "https://buy.stripe.com/xxxxxxxx"

  const TEMPLATES = {
    undergraduate: {
      title: 'Undergraduate Resume',
      preview: 'assets/previews/undergraduate.png',
      tex: 'assets/templates/undergraduate.tex',
    },
    graduate: {
      title: 'Graduate Resume',
      preview: 'assets/previews/graduate.png',
      tex: 'assets/templates/graduate.tex',
    },
    roli: {
      title: 'Roli Resume',
      preview: 'assets/previews/roli.png',
      tex: 'assets/templates/roli.tex',
    },
  };

  const texCache = {};
  const customTex = {};
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function getFocusables(el) {
    return Array.from(
      el.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((node) => {
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function setYear() {
    const yearEl = document.getElementById('year');
    if (!yearEl) return;
    try {
      yearEl.textContent = new Date().getFullYear();
    } catch {
      yearEl.textContent = '2026';
    }
  }

  /* ------------------------------------------------------------------
     Modal
     ------------------------------------------------------------------ */
  const modal = document.getElementById('modal');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalImg = document.getElementById('modal-img');
  let modalOpen = false;
  let triggerButton = null;
  let focusablesInModal = [];

  function openModal(key) {
    const t = TEMPLATES[key];
    if (!t) return;

    triggerButton = document.activeElement;
    modalImg.src = t.preview;
    modalImg.alt = `${t.title} preview`;
    modalTitle.textContent = `${t.title} — preview`;

    modal.hidden = false;
    // Force reflow for transition
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalOpen = true;

    focusablesInModal = getFocusables(modal);
    // Focus close button on open
    setTimeout(() => modalCloseBtn && modalCloseBtn.focus(), 0);
  }

  function closeModal() {
    if (!modalOpen) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    modalOpen = false;

    setTimeout(() => {
      modal.hidden = true;
      modalImg.src = '';
      modalImg.alt = '';
      if (triggerButton && triggerButton.focus) {
        triggerButton.focus();
      }
      triggerButton = null;
    }, 220);
  }

  function trapFocus(evt) {
    if (evt.key !== 'Tab' || focusablesInModal.length === 0) return;

    const first = focusablesInModal[0];
    const last = focusablesInModal[focusablesInModal.length - 1];

    if (evt.shiftKey) {
      if (document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      }
    }
  }

  function initModal() {
    if (!modal) return;

    $$('.btn-view').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.dataset.preview));
    });

    modalCloseBtn.addEventListener('click', closeModal);
    $('.modal-backdrop', modal).addEventListener('click', closeModal);

    document.addEventListener('keydown', (evt) => {
      if (!modalOpen) return;
      if (evt.key === 'Escape') closeModal();
      trapFocus(evt);
    });
  }

  /* ------------------------------------------------------------------
     Hero preview stack cycling
     ------------------------------------------------------------------ */
  function initPreviewStack() {
    const stack = $('.preview-stack');
    if (!stack) return;

    const cards = Array.from(stack.querySelectorAll('img'));
    if (cards.length !== 3) return;

    // Initialize positions: 0 = back, 1 = middle, 2 = front.
    cards.forEach((card, i) => {
      card.dataset.stackPos = String(i);
    });

    // Transform-only slot geometry (must match the CSS attribute-selector
    // rules below) — no top/left involved, so the cycle animation never
    // touches layout.
    const SLOT = {
      0: { x: -12, y: 92, r: -8 }, // back
      1: { x: 67, y: 30, r: 6 },   // middle
      2: { x: 25, y: 0, r: 0 },    // front
    };
    const SHADOW_REST =
      '0 2px 6px rgba(33, 28, 22, 0.07), 0 16px 36px rgba(33, 28, 22, 0.12), 0 36px 72px rgba(33, 28, 22, 0.14)';
    const SHADOW_LIFT =
      '0 10px 28px rgba(33, 28, 22, 0.12), 0 36px 72px rgba(33, 28, 22, 0.16), 0 72px 130px rgba(33, 28, 22, 0.20)';
    const DURATION = 600;
    const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const transformFor = (slot, scale = 1) => `translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg) scale(${scale})`;

    let isAnimating = false;

    const rotatePositions = () => {
      cards.forEach((card) => {
        const current = Number(card.dataset.stackPos);
        card.dataset.stackPos = String((current + 1) % 3);
      });
    };

    const cycle = () => {
      if (isAnimating) return;

      const leaving = cards.find((card) => card.dataset.stackPos === '2');
      if (!leaving) return;

      if (reducedMotion) {
        rotatePositions();
        return;
      }

      const mid = cards.find((card) => card.dataset.stackPos === '1');
      const back = cards.find((card) => card.dataset.stackPos === '0');
      isAnimating = true;

      // Lift the leaving card above the whole stack for the duration of the
      // arc — it only drops back below the others once it has physically
      // settled at the back, so there's no mid-flight stacking-order pop.
      leaving.style.zIndex = '10';

      const liftAnim = leaving.animate(
        [
          { transform: transformFor(SLOT[2]), boxShadow: SHADOW_REST, offset: 0 },
          {
            transform: `translate(${SLOT[2].x + 60}px, -100px) rotate(14deg) scale(0.92)`,
            boxShadow: SHADOW_LIFT,
            offset: 0.5,
          },
          { transform: transformFor(SLOT[0]), boxShadow: SHADOW_REST, offset: 1 },
        ],
        { duration: DURATION, easing: EASING, fill: 'forwards' }
      );

      const midAnim = mid.animate(
        [{ transform: transformFor(SLOT[1]) }, { transform: transformFor(SLOT[2]) }],
        { duration: DURATION, easing: EASING, fill: 'forwards' }
      );

      const backAnim = back.animate(
        [{ transform: transformFor(SLOT[0]) }, { transform: transformFor(SLOT[1]) }],
        { duration: DURATION, easing: EASING, fill: 'forwards' }
      );

      const settle = () => {
        // Hand off from the Web Animations API to the resting CSS positions
        // with transitions frozen, so the attribute swap + cancel can't
        // fire a second (choppy) transition. Reflow, then restore.
        cards.forEach((c) => { c.style.transition = 'none'; });
        rotatePositions();
        [liftAnim, midAnim, backAnim].forEach((anim) => anim.cancel());
        leaving.style.zIndex = '';
        void stack.offsetWidth;
        cards.forEach((c) => { c.style.transition = ''; });
        isAnimating = false;
      };

      Promise.all([liftAnim.finished, midAnim.finished, backAnim.finished]).then(settle, settle);
    };

    const handleActivate = (evt) => {
      if (evt.type === 'keydown' && evt.key !== 'Enter' && evt.key !== ' ') return;
      if (evt.type === 'keydown') evt.preventDefault();
      cycle();
    };

    stack.addEventListener('click', handleActivate);
    stack.addEventListener('keydown', handleActivate);
  }

  /* ------------------------------------------------------------------
     Copy to Clipboard
     ------------------------------------------------------------------ */
  async function fetchTemplate(key) {
    if (texCache[key]) return texCache[key];
    const res = await fetch(TEMPLATES[key].tex);
    if (!res.ok) throw new Error(`Failed to load ${TEMPLATES[key].tex}`);
    const text = await res.text();
    texCache[key] = text;
    return text;
  }

  function getCopyLabel(customReady) {
    if (customReady) {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Custom Code Ready — Copy</span>`;
    }
    return `<span>Copy Code</span>`;
  }

  async function copyTemplate(key, btn) {
    const customReady = !!customTex[key];
    const originalHTML = customReady
      ? getCopyLabel(true)
      : btn.innerHTML;
    const originalWidth = btn.getBoundingClientRect().width;
    btn.style.minWidth = `${originalWidth}px`;

    const setIdle = () => {
      btn.classList.remove('success');
      btn.innerHTML = customReady ? getCopyLabel(true) : originalHTML;
      btn.style.minWidth = '';
    };

    const setSuccess = () => {
      btn.classList.add('success');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied!</span>`;
      setTimeout(setIdle, 1800);
    };

    const setError = (label) => {
      btn.innerHTML = `<span>${label}</span>`;
      setTimeout(setIdle, 2500);
    };

    try {
      let text;
      if (customReady) {
        text = customTex[key];
      } else {
        text = await fetchTemplate(key);
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setSuccess();
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('aria-hidden', 'true');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
          setSuccess();
        } else {
          throw new Error('execCommand copy failed');
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      setError("Couldn't load — try again");
    }
  }

  function findCardForTemplate(key) {
    const copyBtn = $(`[data-tex="${key}"]`);
    if (!copyBtn) return null;
    return copyBtn.closest('.template-card');
  }

  function showCardSkeleton(key) {
    const card = findCardForTemplate(key);
    if (!card) return;
    card.setAttribute('aria-busy', 'true');
    const skeleton = card.querySelector('.card-skeleton');
    if (skeleton) skeleton.hidden = false;
  }

  function hideCardSkeleton(key) {
    const card = findCardForTemplate(key);
    if (!card) return;
    card.removeAttribute('aria-busy');
    const skeleton = card.querySelector('.card-skeleton');
    if (skeleton) skeleton.hidden = true;
  }

  function setCustomState(key, latex) {
    customTex[key] = latex;
    const card = findCardForTemplate(key);
    if (!card) return;
    const copyBtn = card.querySelector(`[data-tex="${key}"]`);
    const resetBtn = card.querySelector(`[data-reset="${key}"]`);
    if (copyBtn) {
      copyBtn.innerHTML = getCopyLabel(true);
    }
    if (resetBtn) {
      resetBtn.hidden = false;
    }
  }

  function resetCustomState(key) {
    delete customTex[key];
    const card = findCardForTemplate(key);
    if (!card) return;
    const copyBtn = card.querySelector(`[data-tex="${key}"]`);
    const resetBtn = card.querySelector(`[data-reset="${key}"]`);
    if (copyBtn) {
      copyBtn.innerHTML = `<span>Copy Code</span>`;
    }
    if (resetBtn) {
      resetBtn.hidden = true;
    }
  }

  function initCopyButtons() {
    $$('.btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => copyTemplate(btn.dataset.tex, btn));
    });
    $$('.btn-reset').forEach((btn) => {
      btn.addEventListener('click', () => resetCustomState(btn.dataset.reset));
    });
  }

  /* ------------------------------------------------------------------
     AI Autofill
     ------------------------------------------------------------------ */
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const MAX_RESUME_CHARS = 10000;
  const ALLOWED_TYPES = {
    pdf: ['application/pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    txt: ['text/plain'],
  };
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

  let currentAutofillKey = null;
  let currentFile = null;
  let currentTurnstileToken = null;

  const aiModal = document.getElementById('ai-modal');
  const aiModalClose = document.getElementById('ai-modal-close');
  const aiBackdrop = $('.ai-modal .modal-backdrop');
  const aiTemplateName = document.getElementById('ai-template-name');
  const aiDropzone = document.getElementById('ai-dropzone');
  const aiFileInput = document.getElementById('ai-file-input');
  const aiFileNameText = document.getElementById('ai-file-name-text');
  const aiStatus = document.getElementById('ai-status');
  const aiStepper = document.getElementById('ai-stepper');
  const aiGenerate = document.getElementById('ai-generate');

  function setAiStatus(text, type = '') {
    if (!aiStatus) return;
    aiStatus.textContent = text;
    aiStatus.className = `ai-status ${type}`;
    aiStatus.style.opacity = '';
  }

  const REASSURANCE_MESSAGES = [
    'Understanding your experience…',
    'Scanning your skills and achievements…',
    'Matching it to the template…',
    'Organizing your education and work history…',
    'Structuring your sections…',
    'Formatting your bullet points…',
    'Writing clean LaTeX…',
    'Escaping the special characters…',
    'Aligning everything to the layout…',
    'Polishing the formatting…',
    'Making it recruiter-ready…',
    'Almost there…',
  ];
  const REASSURANCE_INTERVAL_MS = 5000;
  const REASSURANCE_FADE_MS = 250;
  let reassuranceTimer = null;

  function startReassurance() {
    stopReassurance();
    let i = 0;
    setAiStatus(REASSURANCE_MESSAGES[0], 'loading');

    reassuranceTimer = setInterval(() => {
      i = (i + 1) % REASSURANCE_MESSAGES.length;
      if (!aiStatus) return;
      if (reducedMotion) {
        setAiStatus(REASSURANCE_MESSAGES[i], 'loading');
        return;
      }
      aiStatus.style.opacity = '0';
      setTimeout(() => {
        if (!reassuranceTimer) return; // stopped mid-fade
        aiStatus.textContent = REASSURANCE_MESSAGES[i];
        aiStatus.style.opacity = '1';
      }, REASSURANCE_FADE_MS);
    }, REASSURANCE_INTERVAL_MS);
  }

  function stopReassurance() {
    if (reassuranceTimer) {
      clearInterval(reassuranceTimer);
      reassuranceTimer = null;
    }
    if (aiStatus) aiStatus.style.opacity = '';
  }

  function showStepper() {
    if (!aiStepper) return;
    aiStepper.hidden = false;
    setStepperStep(0);
  }

  function hideStepper() {
    if (!aiStepper) return;
    aiStepper.hidden = true;
  }

  function setStepperStep(stepIndex) {
    if (!aiStepper) return;
    aiStepper.dataset.active = String(stepIndex);
    aiStepper.querySelectorAll('.ai-step').forEach((step) => {
      const idx = Number(step.dataset.step);
      step.classList.remove('active', 'done', 'error');
      step.removeAttribute('aria-current');
      if (idx < stepIndex) {
        step.classList.add('done');
      } else if (idx === stepIndex) {
        step.classList.add('active');
        step.setAttribute('aria-current', 'step');
      }
    });
  }

  function markStepperError() {
    if (!aiStepper) return;
    aiStepper.querySelectorAll('.ai-step').forEach((step) => {
      if (step.classList.contains('active')) {
        step.classList.remove('active', 'done');
        step.classList.add('error');
        step.removeAttribute('aria-current');
      }
    });
    shakeModal();
  }

  function markStepperSuccess() {
    setStepperStep(2);
  }

  function isAllowedFile(file) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
    const typeOk = Object.values(ALLOWED_TYPES).some((types) => types.includes(file.type));
    return typeOk;
  }

  function validateFile(file) {
    if (!file) return 'Please choose a file first.';
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 5 MB.';
    }
    const typeOk = Object.values(ALLOWED_TYPES).some((types) => types.includes(file.type));
    if (!typeOk) {
      return 'File type does not match its extension. Please upload a valid PDF, DOCX, or TXT file.';
    }
    return null;
  }

  async function extractText(file) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (ext === '.txt') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read text file.'));
        reader.readAsText(file);
      });
    }

    if (ext === '.docx') {
      if (typeof mammoth === 'undefined') {
        throw new Error('DOCX library is not loaded. Please refresh and try again.');
      }
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    if (ext === '.pdf') {
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF library is not loaded. Please refresh and try again.');
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push(textContent.items.map((item) => item.str).join(' '));
      }
      return pages.join('\n');
    }

    throw new Error('Unsupported file type.');
  }

  function truncateText(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max);
  }

  function setSelectedFile(file) {
    currentFile = file;
    if (aiFileNameText) aiFileNameText.textContent = file.name;
    if (aiDropzone) aiDropzone.classList.add('has-file');
    setAiStatus('');
    updateGenerateButton();
  }

  function clearSelectedFile() {
    if (aiFileNameText) aiFileNameText.textContent = '';
    if (aiDropzone) aiDropzone.classList.remove('has-file');
  }

  function openAiModal(key) {
    if (!aiModal) return;
    currentAutofillKey = key;
    currentFile = null;
    currentTurnstileToken = null;

    if (aiTemplateName) {
      aiTemplateName.textContent = TEMPLATES[key]?.title || '';
    }
    clearSelectedFile();
    setAiStatus('');
    hideStepper();
    if (currentAutofillKey) hideCardSkeleton(currentAutofillKey);
    if (aiFileInput) aiFileInput.value = '';
    updateGenerateButton();

    aiModal.hidden = false;
    void aiModal.offsetWidth;
    aiModal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Reset Turnstile widget so the user gets a fresh challenge each time.
    if (window.turnstile && aiModal.querySelector('.cf-turnstile')) {
      try {
        window.turnstile.reset(aiModal.querySelector('.cf-turnstile'));
      } catch (err) {
        // Widget may not have rendered yet; ignore.
      }
    }

    setTimeout(() => aiModalClose && aiModalClose.focus(), 0);
  }

  function closeAiModal() {
    if (!aiModal) return;
    stopReassurance();
    if (currentAutofillKey) hideCardSkeleton(currentAutofillKey);
    aiModal.classList.remove('open');
    aiModal.querySelector('.modal-panel')?.classList.remove('shake');
    document.body.style.overflow = '';
    setTimeout(() => {
      aiModal.hidden = true;
      currentAutofillKey = null;
      currentFile = null;
      currentTurnstileToken = null;
    }, 220);
  }

  function shakeModal() {
    if (reducedMotion) return;
    const panel = aiModal?.querySelector('.modal-panel');
    if (!panel) return;
    panel.classList.remove('shake');
    void panel.offsetWidth;
    panel.classList.add('shake');
    panel.addEventListener('animationend', () => panel.classList.remove('shake'), { once: true });
  }

  function updateGenerateButton() {
    if (!aiGenerate) return;
    const valid = currentFile && currentTurnstileToken;
    aiGenerate.disabled = !valid;
  }

  function refreshTurnstile() {
    currentTurnstileToken = null;
    if (window.turnstile && aiModal && aiModal.querySelector('.cf-turnstile')) {
      try { window.turnstile.reset(aiModal.querySelector('.cf-turnstile')); } catch (e) {}
    }
    updateGenerateButton();
  }

  async function handleGenerate() {
    if (!currentAutofillKey || !currentFile) return;

    const validation = validateFile(currentFile);
    if (validation) {
      setAiStatus(validation, 'error');
      return;
    }

    aiGenerate.disabled = true;
    showStepper();
    showCardSkeleton(currentAutofillKey);
    setAiStatus('Reading your résumé…', 'loading');

    let resumeText = '';
    try {
      resumeText = await extractText(currentFile);
    } catch (err) {
      console.error('Extraction error:', err);
      setAiStatus('We couldn\'t read text from this file — try a text-based PDF, a DOCX, or paste your info.', 'error');
      markStepperError();
      hideCardSkeleton(currentAutofillKey);
      aiGenerate.disabled = false;
      return;
    }

    if (!resumeText.trim()) {
      setAiStatus('We couldn\'t read text from this file — try a text-based PDF, a DOCX, or paste your info.', 'error');
      markStepperError();
      hideCardSkeleton(currentAutofillKey);
      aiGenerate.disabled = false;
      return;
    }

    resumeText = truncateText(resumeText, MAX_RESUME_CHARS);
    setStepperStep(1);
    startReassurance();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: currentAutofillKey,
          resumeText,
          turnstileToken: currentTurnstileToken,
        }),
      });

      const data = await response.json().catch(() => ({}));
      stopReassurance();

      if (!response.ok) {
        const message = data.message || data.error || 'The AI is busy — please try again.';
        markStepperError();
        hideCardSkeleton(currentAutofillKey);
        if (response.status === 429) {
          setAiStatus('You\'ve hit today\'s free limit — try again tomorrow.', 'error');
        } else if (response.status === 403) {
          setAiStatus('Security check failed — please refresh and try again.', 'error');
        } else {
          setAiStatus(message, 'error');
        }
        refreshTurnstile();
        return;
      }

      if (!data.latex) {
        markStepperError();
        hideCardSkeleton(currentAutofillKey);
        setAiStatus('The AI returned an empty response — please try again.', 'error');
        refreshTurnstile();
        return;
      }

      setCustomState(currentAutofillKey, data.latex);
      markStepperSuccess();
      setAiStatus('Your custom LaTeX is ready!', 'success');
      setTimeout(() => {
        hideStepper();
        hideCardSkeleton(currentAutofillKey);
        closeAiModal();
      }, 800);
    } catch (err) {
      console.error('Generate error:', err);
      stopReassurance();
      markStepperError();
      hideCardSkeleton(currentAutofillKey);
      setAiStatus('The AI is busy — please try again.', 'error');
      refreshTurnstile();
    }
  }

  function initAutofill() {
    hideStepper();

    $$('.btn-autofill').forEach((btn) => {
      btn.addEventListener('click', () => openAiModal(btn.dataset.autofill));
    });

    if (aiModalClose) aiModalClose.addEventListener('click', closeAiModal);
    if (aiBackdrop) aiBackdrop.addEventListener('click', closeAiModal);

    if (aiDropzone && aiFileInput) {
      aiDropzone.addEventListener('click', () => aiFileInput.click());
      aiDropzone.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          aiFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach((evtName) => {
        aiDropzone.addEventListener(evtName, (evt) => {
          evt.preventDefault();
          aiDropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach((evtName) => {
        aiDropzone.addEventListener(evtName, (evt) => {
          evt.preventDefault();
          aiDropzone.classList.remove('drag-over');
        });
      });

      aiDropzone.addEventListener('drop', (evt) => {
        if (evt.dataTransfer.files && evt.dataTransfer.files[0]) {
          setSelectedFile(evt.dataTransfer.files[0]);
        }
      });

      aiFileInput.addEventListener('change', (evt) => {
        if (evt.target.files && evt.target.files[0]) {
          setSelectedFile(evt.target.files[0]);
        }
      });
    }

    if (aiGenerate) {
      aiGenerate.addEventListener('click', handleGenerate);
    }

    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape' && aiModal && aiModal.classList.contains('open')) {
        closeAiModal();
      }
    });

    // Listen for Turnstile token from the global callback defined in index.html.
    window.addEventListener('turnstile-token', (evt) => {
      currentTurnstileToken = evt.detail && evt.detail.token ? evt.detail.token : evt.detail;
      updateGenerateButton();
    });

    // Fallback: Cloudflare Turnstile calls this global callback directly.
    window.turnstileSuccess = function(token) {
      currentTurnstileToken = token;
      updateGenerateButton();
    };
  }

  /* ------------------------------------------------------------------
     Visitor counter (CounterAPI)
     ------------------------------------------------------------------ */
  function initVisitorCounter() {
    const COUNTER_WORKSPACE = 'rolivela';
    const COUNTER_KEY = 'latex-resumes-visits';
    const el = document.getElementById('visit-count');
    const footerCounter = document.getElementById('footer-counter');

    if (!el || !footerCounter) return;

    fetch(`https://api.counterapi.dev/v1/${COUNTER_WORKSPACE}/${COUNTER_KEY}/up`)
      .then((r) => {
        if (!r.ok) throw new Error('counter');
        return r.json();
      })
      .then((res) => {
        if (res && typeof res.count === 'number') {
          el.textContent = res.count.toLocaleString();
          footerCounter.classList.add('visible');
          footerCounter.removeAttribute('aria-hidden');
        } else {
          throw new Error('counter');
        }
      })
      .catch(() => {
        // Graceful fallback: keep the counter hidden if the request fails.
      });
  }

  /* ------------------------------------------------------------------
     Feedback form (EmailJS)
     ------------------------------------------------------------------ */
  function initFeedbackForm() {
    const form = document.getElementById('feedback-form');
    if (!form) return;

    if (typeof emailjs !== 'undefined') {
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    const status = document.getElementById('form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Send';

    form.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      if (status) {
        status.textContent = '';
        status.className = 'form-status';
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (typeof emailjs === 'undefined') {
        if (status) {
          status.textContent = 'Something went wrong — please try again or email me directly.';
          status.classList.add('error');
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      if (submitBtn) submitBtn.textContent = 'Sending...';

      try {
        await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);
        if (status) {
          status.textContent = 'Thanks — your message is on its way.';
          status.classList.add('success');
        }
        form.reset();
      } catch (err) {
        console.error('EmailJS error:', err);
        if (status) {
          status.textContent = 'Something went wrong — please try again or email me directly.';
          status.classList.add('error');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        if (submitBtn) submitBtn.textContent = originalText;
      }
    });
  }

  /* ------------------------------------------------------------------
     Donate
     ------------------------------------------------------------------ */
  function initLinkedInPlaceholder() {
    const link = document.getElementById('linkedin-placeholder');
    if (!link) return;
    link.addEventListener('click', (evt) => {
      evt.preventDefault();
    });
  }

  function initDonate() {
    const btn = document.getElementById('donate-btn');
    const note = document.getElementById('donate-note');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (STRIPE_PAYMENT_LINK) {
        window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener,noreferrer');
      } else if (note) {
        note.textContent = 'Donations coming soon — thank you!';
      }
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  function initReveal() {
    const reveals = $$('.reveal');
    if (!reveals.length) return;

    if (reducedMotion) {
      reveals.forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = Number(entry.target.dataset.stagger) || 0;
            setTimeout(() => entry.target.classList.add('in'), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    reveals.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------
     Smooth scroll for anchor links
     ------------------------------------------------------------------ */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (evt) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        evt.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function init() {
    setYear();
    initSmoothScroll();
    initPreviewStack();
    initModal();
    initCopyButtons();
    initAutofill();
    initDonate();
    initLinkedInPlaceholder();
    initVisitorCounter();
    initFeedbackForm();
    initReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
