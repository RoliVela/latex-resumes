/*
  LaTeX Resumes — Interactions
  Vanilla JS. No frameworks. Runs by opening index.html.

  TODO(Roli):
  1. Replace STRIPE_PAYMENT_LINK with your Stripe Payment Link URL.
  2. Replace [ROLI_LINKEDIN_URL] in index.html with your LinkedIn URL.
  3. Confirm EmailJS template variables match the input name= attributes in index.html.
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  async function copyTemplate(key, btn) {
    const originalHTML = btn.innerHTML;
    const originalWidth = btn.getBoundingClientRect().width;
    btn.style.minWidth = `${originalWidth}px`;

    const setIdle = () => {
      btn.classList.remove('success');
      btn.innerHTML = originalHTML;
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
      const text = await fetchTemplate(key);

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

  function initCopyButtons() {
    $$('.btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => copyTemplate(btn.dataset.tex, btn));
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
    initModal();
    initCopyButtons();
    initDonate();
    initLinkedInPlaceholder();
    initFeedbackForm();
    initReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
