/*
  Vercel serverless function: POST /api/generate
  Proxies résumé text + template to the NVIDIA LLM API.
  Security: secret keys live ONLY in Vercel environment variables.
*/

const { createHash } = require('crypto');
const TEMPLATES = require('./templates');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
const FALLBACK_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_RESUME_CHARS = 10000;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 24 * 60 * 60; // 24 hours

const ALLOWED_ORIGINS = new Set([
  'https://latex-resumes.vercel.app',
  'https://latex-resumes-git-main-rolivela.vercel.app',
  'http://localhost:3000',
  'http://localhost:8000',
]);

const TEMPLATE_KEYS = new Set(['undergraduate', 'graduate', 'roli']);

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const VERCEL_KV_REST_API_URL = process.env.VERCEL_KV_REST_API_URL;
const VERCEL_KV_REST_API_TOKEN = process.env.VERCEL_KV_REST_API_TOKEN;

function getKvUrl() {
  return UPSTASH_REDIS_REST_URL || VERCEL_KV_REST_API_URL;
}

function getKvToken() {
  return UPSTASH_REDIS_REST_TOKEN || VERCEL_KV_REST_API_TOKEN;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.startsWith('http://localhost:')) return true;
  return false;
}

function withCorsHeaders(headers, origin) {
  const allowed = isAllowedOrigin(origin) ? origin : 'https://latex-resumes.vercel.app';
  return {
    ...headers,
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ---------------------------------------------------------------------------
// Rate limiting (Upstash Redis REST or Vercel KV)
// ---------------------------------------------------------------------------
async function getRateLimitKey(ip) {
  const raw = ip || 'unknown';
  return createHash('sha256').update(`rate:${raw}`).digest('hex');
}

async function checkRateLimit(ip) {
  const url = getKvUrl();
  const token = getKvToken();
  if (!url || !token) return true; // allow if not configured (dev fallback)

  const key = await getRateLimitKey(ip);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_WINDOW_SECONDS;

  try {
    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '0', String(windowStart)],
      ['ZRANGE', key, '0', '-1'],
    ];
    const pipeRes = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline),
    });
    const pipeData = await pipeRes.json();
    const requests = (pipeData && pipeData[1]) || [];

    if (requests.length >= RATE_LIMIT) {
      return false;
    }

    await fetch(`${url}/zadd/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: now, member: `${now}-${Math.random().toString(36).slice(2)}` }),
    });
    await fetch(`${url}/expire/${key}/${RATE_WINDOW_SECONDS}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    return true;
  } catch (err) {
    console.error('Rate limit check failed:', err.message);
    return true; // fail open to avoid blocking legitimate users
  }
}

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------
async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET_KEY) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Load template
// ---------------------------------------------------------------------------
function loadTemplate(key) {
  return TEMPLATES[key];
}

// ---------------------------------------------------------------------------
// Prompt engineering
// ---------------------------------------------------------------------------
function buildUserPrompt(templateLaTeX, resumeText) {
  return `Below is a LaTeX résumé template, followed by a person's résumé text. Fill in the template using only the information in the résumé text.

--- TEMPLATE LATEX ---
${templateLaTeX}

--- RÉSUMÉ TEXT ---
${resumeText}`;
}

// ---------------------------------------------------------------------------
// Output sanitization
// ---------------------------------------------------------------------------
function sanitizeLatex(output) {
  let cleaned = output.trim();
  // Remove markdown code fences
  cleaned = cleaned.replace(/^[\s]*```(?:latex)?[\s]*/i, '');
  cleaned = cleaned.replace(/```[\s]*$/, '');
  cleaned = cleaned.trim();

  const docClassIndex = cleaned.indexOf('\\documentclass');
  if (docClassIndex > 0) {
    cleaned = cleaned.slice(docClassIndex);
  }

  if (!cleaned.startsWith('\\documentclass')) {
    return null;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// NVIDIA API call
// ---------------------------------------------------------------------------
async function callNvidia(messages, attempt = 0) {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured');
  }

  const model = attempt > 0 ? FALLBACK_MODEL : MODEL;

  const res = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 3000,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) {
    throw new Error('NVIDIA API returned empty content');
  }
  return content;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';

  function sendError(status, message) {
    Object.entries(withCorsHeaders({}, origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.status(status).json({ message });
  }

  if (req.method === 'OPTIONS') {
    Object.entries(withCorsHeaders({}, origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    Object.entries(withCorsHeaders({}, origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.status(200).json({
      ok: true,
      model: MODEL,
      fallbackModel: FALLBACK_MODEL,
      hasApiKey: !!NVIDIA_API_KEY,
      hasTurnstileSecret: !!TURNSTILE_SECRET_KEY,
      rateLimitConfigured: !!(getKvUrl() && getKvToken()),
    });
    return;
  }

  if (req.method !== 'POST') {
    sendError(405, 'Method not allowed');
    return;
  }

  const { template, resumeText, turnstileToken } = req.body || {};

  if (!TEMPLATE_KEYS.has(template)) {
    sendError(400, 'Invalid template.');
    return;
  }

  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    sendError(400, 'No résumé text provided.');
    return;
  }

  if (resumeText.length > MAX_RESUME_CHARS) {
    sendError(400, 'Résumé text exceeds the maximum allowed length.');
    return;
  }

  if (!turnstileToken) {
    sendError(400, 'Security check token missing.');
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  if (!(await verifyTurnstile(turnstileToken))) {
    sendError(403, 'Security check failed. Please refresh and try again.');
    return;
  }

  if (!(await checkRateLimit(clientIp))) {
    sendError(429, "You've hit today's free limit — try again tomorrow.");
    return;
  }

  let templateLaTeX;
  try {
    templateLaTeX = loadTemplate(template);
  } catch (err) {
    console.error('Template load error:', err.message);
    sendError(500, 'Template could not be loaded.');
    return;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You convert a person\'s résumé text into a filled-in copy of a provided LaTeX template. Output only raw LaTeX — no explanations, no markdown fences. Preserve the template preamble, packages, and custom macros/environments exactly. Only replace bracketed [PLACEHOLDER] content and section entries with the person\'s real information, matching the template\'s existing structure and formatting commands. Only use information present in the résumé text. Do NOT invent, embellish, or fabricate employers, dates, GPAs, or achievements. If a field is not in the source, leave the placeholder or omit that line — never make something up. Escape LaTeX special characters in all user-derived text: & % $ # _ { } ~ ^ \\\\ (e.g. & -> \\\\, % -> \\\\\%, _ -> \\\\_, etc.). URLs go in the template\'s existing \\href pattern. Keep it to the template\'s length/structure (one page where the template is one page). If filling in the content leaves any bullet points empty, remove those empty \\item lines entirely instead of leaving blank bullets. Return a complete, compilable document from \\documentclass to \\end{document}.',
    },
    {
      role: 'user',
      content: buildUserPrompt(templateLaTeX, resumeText),
    },
  ];

  let latex = null;
  let lastError = null;
  for (let attempt = 0; attempt <= 1 && !latex; attempt++) {
    try {
      const rawLatex = await callNvidia(messages, attempt);
      latex = sanitizeLatex(rawLatex);
      if (!latex) lastError = new Error('model output was not valid LaTeX');
    } catch (err) {
      lastError = err;
      console.error(`NVIDIA attempt ${attempt} failed:`, err.message);
    }
  }

  Object.entries(withCorsHeaders({}, origin)).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');

  if (latex) {
    res.status(200).json({ latex });
  } else {
    // TEMP DEBUG: surface the real upstream reason so the failure can be diagnosed.
    const reason = String((lastError && lastError.message) || 'unknown').slice(0, 300);
    console.error('Generation failed:', reason);
    res.status(502).json({ message: 'AI error: ' + reason });
  }
}
