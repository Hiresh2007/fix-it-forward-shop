const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDatabase } = require('./db');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');
const SESSION_COOKIE = 'fif_session';
const CSRF_COOKIE = 'fif_csrf';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const db = createDatabase({ rootDir: ROOT });
fs.mkdirSync(LOG_DIR, { recursive: true });

const rateLimitState = new Map();
const metrics = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0,
  authFailures: 0,
  orderFailures: 0,
};

function defaultHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    ...defaultHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, headers = {}) {
  res.writeHead(statusCode, {
    ...defaultHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function cookieOptions({ maxAgeSeconds = null, httpOnly = true } = {}) {
  return [
    httpOnly ? 'HttpOnly' : '',
    'SameSite=Strict',
    'Path=/',
    maxAgeSeconds !== null ? `Max-Age=${maxAgeSeconds}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function makeCookie(name, value, options) {
  return `${name}=${encodeURIComponent(value)}; ${cookieOptions(options)}`;
}

function expiredCookie(name) {
  return `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

function clientIp(req) {
  return req.socket?.remoteAddress || 'unknown';
}

function appendLog(entry) {
  fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, () => {});
}

function rateLimit(req, key, limit, windowMs) {
  const bucketKey = `${clientIp(req)}:${key}`;
  const now = Date.now();
  const bucket = rateLimitState.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateLimitState.set(bucketKey, bucket);
  if (bucket.count > limit) {
    return { limited: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { limited: false };
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, original] = String(storedHash).split(':');
  if (!salt || !original) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(original, 'hex'));
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function trackingForOrder(order) {
  const createdAt = new Date(order.createdAt).getTime();
  const shippingDays = order.shipping?.method === 'overnight' ? 1 : order.shipping?.method === 'express' ? 3 : 6;
  const deliveredAt = new Date(createdAt + shippingDays * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const progress = (now - createdAt) / Math.max(deliveredAt.getTime() - createdAt, 1);

  if (now >= deliveredAt.getTime()) {
    return {
      stage: 'delivered',
      label: 'Delivered',
      location: `Delivered in ${order.shipping.city}`,
      estimatedDelivery: deliveredAt.toISOString(),
      deliveredAt: deliveredAt.toISOString(),
    };
  }
  if (progress >= 0.8) {
    return {
      stage: 'out_for_delivery',
      label: 'Out for delivery',
      location: `${order.shipping.city} local delivery hub`,
      estimatedDelivery: deliveredAt.toISOString(),
      deliveredAt: null,
    };
  }
  if (progress >= 0.45) {
    return {
      stage: 'in_transit',
      label: 'In transit',
      location: 'Regional sorting facility',
      estimatedDelivery: deliveredAt.toISOString(),
      deliveredAt: null,
    };
  }
  return {
    stage: 'processing',
    label: 'Preparing shipment',
    location: 'Fix-It Forward fulfillment center',
    estimatedDelivery: deliveredAt.toISOString(),
    deliveredAt: null,
  };
}

function publicOrder(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    items: order.items,
    pricing: order.pricing,
    shipping: order.shipping,
    contact: {
      firstName: order.contact.firstName,
      lastName: order.contact.lastName,
      email: order.contact.email,
    },
    tracking: trackingForOrder(order),
  };
}

function validateCredentials({ name, email, password }, requireName) {
  if (requireName && String(name || '').trim().length < 2) {
    return 'Name must be at least 2 characters.';
  }
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Enter a valid email address.';
  }
  const pwd = String(password || '');
  if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
    return 'Password must be at least 8 characters and include letters and numbers.';
  }
  return null;
}

function validateCheckoutPayload(body) {
  if (!body || typeof body !== 'object') return 'Invalid order payload.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.contact?.email || '').trim())) return 'Enter a valid checkout email.';
  if (String(body.contact?.firstName || '').trim().length < 2) return 'First name is required.';
  if (String(body.contact?.lastName || '').trim().length < 1) return 'Last name is required.';
  if (String(body.contact?.phone || '').replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
  if (String(body.shipping?.address || '').trim().length < 5) return 'Enter a valid street address.';
  if (String(body.shipping?.city || '').trim().length < 2) return 'Enter a valid city.';
  if (String(body.shipping?.postalCode || '').trim().length < 4) return 'Enter a valid postal code.';
  return null;
}

function getCurrentUser(req) {
  db.deleteExpiredSessions(new Date().toISOString());
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = db.findSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.deleteSession(token);
    return null;
  }
  db.touchSession(token, new Date().toISOString());
  const user = db.findUserById(session.userId);
  if (!user) {
    db.deleteSession(token);
    return null;
  }
  return { token, user, session };
}

function ensureCsrf(req) {
  const cookies = parseCookies(req);
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}

function issueCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function safePathname(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return normalized === path.sep ? '' : normalized;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      ...defaultHeaders(),
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    });
    res.end(data);
  });
}

async function handleCsrf(req, res, pathname) {
  if (pathname === '/api/csrf' && req.method === 'GET') {
    const token = issueCsrfToken();
    return sendJson(
      res,
      200,
      { csrfToken: token },
      {
        'Set-Cookie': makeCookie(CSRF_COOKIE, token, { maxAgeSeconds: 2 * 60 * 60, httpOnly: true }),
        'Cache-Control': 'no-store',
      }
    );
  }
  return false;
}

async function handleProducts(req, res, pathname) {
  if (pathname === '/api/products' && req.method === 'GET') {
    return sendJson(res, 200, { products: db.allProducts() }, { 'Cache-Control': 'no-store' });
  }
  const match = pathname.match(/^\/api\/products\/(\d+)$/);
  if (match && req.method === 'GET') {
    const product = db.getProductById(Number(match[1]));
    if (!product) return sendJson(res, 404, { error: 'Product not found.' });
    return sendJson(res, 200, { product }, { 'Cache-Control': 'no-store' });
  }
  return false;
}

async function handleAuth(req, res, pathname) {
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const current = getCurrentUser(req);
    return sendJson(res, 200, { user: current ? publicUser(current.user) : null }, { 'Cache-Control': 'no-store' });
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    if (!ensureCsrf(req)) return sendJson(res, 403, { error: 'Invalid CSRF token.' });
    const limit = rateLimit(req, 'auth-register', 20, 10 * 60 * 1000);
    if (limit.limited) return sendJson(res, 429, { error: 'Too many registration attempts. Try again later.' }, { 'Retry-After': String(limit.retryAfter) });
    const body = await parseBody(req);
    const error = validateCredentials(body, true);
    if (error) return sendJson(res, 400, { error });

    const email = body.email.trim().toLowerCase();
    if (db.findUserByEmail(email)) {
      metrics.authFailures += 1;
      return sendJson(res, 409, { error: 'An account with that email already exists.' });
    }

    const user = db.createUser({
      id: crypto.randomUUID(),
      name: body.name.trim(),
      email,
      passwordHash: createPasswordHash(body.password),
      createdAt: new Date().toISOString(),
    });
    const rawToken = crypto.randomBytes(32).toString('hex');
    db.createSession({
      token: rawToken,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    });
    return sendJson(
      res,
      201,
      { user: publicUser(user) },
      {
        'Set-Cookie': makeCookie(SESSION_COOKIE, rawToken, { maxAgeSeconds: SESSION_TTL_MS / 1000, httpOnly: true }),
        'Cache-Control': 'no-store',
      }
    );
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    if (!ensureCsrf(req)) return sendJson(res, 403, { error: 'Invalid CSRF token.' });
    const limit = rateLimit(req, 'auth-login', 10, 10 * 60 * 1000);
    if (limit.limited) return sendJson(res, 429, { error: 'Too many sign-in attempts. Try again later.' }, { 'Retry-After': String(limit.retryAfter) });
    const body = await parseBody(req);
    const error = validateCredentials({ email: body.email, password: body.password }, false);
    if (error) {
      metrics.authFailures += 1;
      return sendJson(res, 400, { error });
    }
    const user = db.findUserByEmail(body.email.trim().toLowerCase());
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      metrics.authFailures += 1;
      return sendJson(res, 401, { error: 'Incorrect email or password.' });
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    db.createSession({
      token: rawToken,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    });
    return sendJson(
      res,
      200,
      { user: publicUser(user) },
      {
        'Set-Cookie': makeCookie(SESSION_COOKIE, rawToken, { maxAgeSeconds: SESSION_TTL_MS / 1000, httpOnly: true }),
        'Cache-Control': 'no-store',
      }
    );
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    if (!ensureCsrf(req)) return sendJson(res, 403, { error: 'Invalid CSRF token.' });
    const current = getCurrentUser(req);
    if (current) db.deleteSession(current.token);
    return sendJson(res, 200, { ok: true }, {
      'Set-Cookie': expiredCookie(SESSION_COOKIE),
      'Cache-Control': 'no-store',
    });
  }

  return false;
}

async function handleOrders(req, res, pathname) {
  const current = getCurrentUser(req);
  if (!current) {
    metrics.authFailures += 1;
    return sendJson(res, 401, { error: 'Sign in required.' });
  }

  if (pathname === '/api/orders' && req.method === 'GET') {
    const orders = db.allOrdersForUser(current.user.id).map(publicOrder);
    return sendJson(res, 200, { orders }, { 'Cache-Control': 'no-store' });
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    if (!ensureCsrf(req)) return sendJson(res, 403, { error: 'Invalid CSRF token.' });
    const limit = rateLimit(req, 'orders-create', 12, 10 * 60 * 1000);
    if (limit.limited) return sendJson(res, 429, { error: 'Too many order attempts. Try again later.' }, { 'Retry-After': String(limit.retryAfter) });
    const body = await parseBody(req);
    if (!Array.isArray(body.items) || !body.items.length) {
      metrics.orderFailures += 1;
      return sendJson(res, 400, { error: 'Order must include at least one item.' });
    }
    const checkoutError = validateCheckoutPayload(body);
    if (checkoutError) {
      metrics.orderFailures += 1;
      return sendJson(res, 400, { error: checkoutError });
    }
    try {
      const order = db.createOrder({
        id: `FIF-${Date.now().toString(36).toUpperCase()}`,
        userId: current.user.id,
        createdAt: new Date().toISOString(),
        items: body.items.map(item => ({
          productId: Number(item.productId),
          name: String(item.name || '').trim(),
          qty: Number(item.qty) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          lineTotal: (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
        })),
        pricing: {
          subtotal: Number(body.pricing?.subtotal) || 0,
          discount: Number(body.pricing?.discount) || 0,
          tax: Number(body.pricing?.tax) || 0,
          total: Number(body.pricing?.total) || 0,
        },
        contact: {
          firstName: String(body.contact?.firstName || '').trim(),
          lastName: String(body.contact?.lastName || '').trim(),
          email: String(body.contact?.email || current.user.email).trim(),
          phone: String(body.contact?.phone || '').trim(),
        },
        shipping: {
          method: String(body.shipping?.method || 'standard'),
          methodLabel: String(body.shipping?.methodLabel || 'Standard (5-7 days)'),
          fee: Number(body.shipping?.fee) || 0,
          address: String(body.shipping?.address || '').trim(),
          city: String(body.shipping?.city || '').trim(),
          postalCode: String(body.shipping?.postalCode || '').trim(),
        },
      });
      return sendJson(res, 201, { order: publicOrder(order) }, { 'Cache-Control': 'no-store' });
    } catch (error) {
      metrics.orderFailures += 1;
      const message = error.message || 'Could not create order.';
      const status = /left in stock|not found/i.test(message) ? 409 : 400;
      return sendJson(res, status, { error: message });
    }
  }

  return false;
}

function createApp() {
  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const pathname = url.pathname;

    metrics.totalRequests += 1;
    res.on('finish', () => {
      if (res.statusCode >= 500) metrics.status5xx += 1;
      else if (res.statusCode >= 400) metrics.status4xx += 1;
      else if (res.statusCode >= 200) metrics.status2xx += 1;
      appendLog({
        time: new Date().toISOString(),
        ip: clientIp(req),
        method: req.method,
        path: pathname,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    try {
      if (pathname === '/health') {
        return sendJson(res, 200, { ok: true, uptimeSeconds: Math.round(process.uptime()) }, { 'Cache-Control': 'no-store' });
      }

      if (pathname === '/metrics') {
        return sendJson(res, 200, {
          ...metrics,
          uptimeSeconds: Math.round(process.uptime()),
          activeSessionsEstimate: 'tracked in database',
        }, { 'Cache-Control': 'no-store' });
      }

      if (pathname.startsWith('/api/csrf')) {
        const handled = await handleCsrf(req, res, pathname);
        if (handled !== false) return;
      }

      if (pathname.startsWith('/api/products')) {
        const handled = await handleProducts(req, res, pathname);
        if (handled !== false) return;
        return sendJson(res, 404, { error: 'Products endpoint not found.' });
      }

      if (pathname.startsWith('/api/auth/')) {
        const handled = await handleAuth(req, res, pathname);
        if (handled !== false) return;
        return sendJson(res, 404, { error: 'Auth endpoint not found.' });
      }

      if (pathname.startsWith('/api/orders')) {
        const handled = await handleOrders(req, res, pathname);
        if (handled !== false) return;
        return sendJson(res, 404, { error: 'Orders endpoint not found.' });
      }

      const relativePath = pathname === '/' ? 'index.html' : safePathname(pathname).replace(/^[/\\]+/, '');
      const fullPath = path.join(ROOT, relativePath);
      if (!fullPath.startsWith(ROOT)) return sendText(res, 403, 'Forbidden');
      serveFile(res, fullPath);
    } catch (error) {
      const statusCode = error.message === 'Invalid JSON body' ? 400 : error.message === 'Payload too large' ? 413 : 500;
      sendJson(res, statusCode, { error: error.message || 'Server error' });
    }
  });
}

function startServer(port = PORT, host = HOST) {
  const server = createApp();
  server.listen(port, host, () => {
    console.log(`Fix-It Forward Shop server running at http://${host}:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
