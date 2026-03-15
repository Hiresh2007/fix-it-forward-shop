/* ===================================================================
   FIX-IT FORWARD — Complete App
   Submitted by: Amogh & Hiresh
   =================================================================== */

/* ── PRODUCT DATA ──────────────────────────────────────────────── */
let PRODUCTS = [];

const PROMOS = { FORWARD20: 0.20, SAVE10: 0.10, HIRESH5: 0.05, AMOGH15: 0.15 };
const PRODUCT_BUNDLES = {
  1:['Ratchet handle','Magnetic bits','Socket adapter','Hard carry case'],
  2:['Charging case','USB-C cable','Silicone tips','Quick start guide'],
  3:['Lamp head','USB-C cable','Weighted base','Touch control pad'],
  4:['Keyboard','USB-C cable','Keycap puller','Extra switches'],
  5:['Board','Non-slip pads','Care oil','Recipe card'],
  6:['Bottle','Leakproof lid','Carry loop','Cleaning brush'],
  7:['Backpack','Rain cover','Chest strap','Hydration sleeve'],
  8:['Power bank','USB-C cable','Travel pouch','User guide'],
  9:['Driver body','24-bit set','Charging cable','Storage case'],
  10:['Dripper','Carafe','Filters','Measuring spoon'],
  11:['Pair of shoes','Extra laces','Heel inserts','Care card'],
  12:['Velcro ties','Cable clips','Sleeves','Label stickers'],
};
function pngImageSet(folder, labels) {
  return labels.map((label, index) => {
    const file = index + 1;
    return {
      label,
      src:`product-images/${folder}/${file}.png`,
      fallback:`product-images/${folder}/${file}.svg`,
    };
  });
}

function photoImageSet(folder, labels, ext = 'jpg') {
  return labels.map((label, index) => {
    const file = index + 1;
    return {
      label,
      src:`product-images/${folder}/${file}.${ext}`,
      fallback:`product-images/${folder}/${file}.svg`,
    };
  });
}

const PRODUCT_IMAGE_SETS = {
  1:[
    { label:'Toolkit Layout', src:'product-images/pro-repair-toolkit/1.jpeg', fallback:'product-images/pro-repair-toolkit/1.svg' },
    { label:'3 PCS Pliers', src:'product-images/pro-repair-toolkit/2.png', fallback:'product-images/pro-repair-toolkit/2.svg' },
    { label:'T-Handle Bits', src:'product-images/pro-repair-toolkit/3.png', fallback:'product-images/pro-repair-toolkit/3.svg' },
    { label:'Magnetic Drivers', src:'product-images/pro-repair-toolkit/4.png', fallback:'product-images/pro-repair-toolkit/4.svg' },
    { label:'Household Set', src:'product-images/pro-repair-toolkit/5.png', fallback:'product-images/pro-repair-toolkit/5.svg' },
  ],
  2:[
    { label:'Front', src:'product-images/wireless-earbuds-x/1.png' },
    { label:'Angle', src:'product-images/wireless-earbuds-x/2.png' },
    { label:'Detail', src:'product-images/wireless-earbuds-x/3.png' },
    { label:'In Box', src:'product-images/wireless-earbuds-x/4.png' },
  ],
  3:photoImageSet('smart-led-desk-lamp', ['Front','Angle','Detail','In Box']),
  4:pngImageSet('ergonomic-keyboard', ['Front','Angle','Detail','In Box']),
  5:pngImageSet('bamboo-cutting-board', ['Front','Angle','Detail','In Box']),
  6:pngImageSet('stainless-water-bottle', ['Front','Angle','Detail','In Box']),
  7:pngImageSet('hiking-day-pack-20l', ['Front','Angle','Detail','In Box']),
  8:pngImageSet('portable-charger-20k', ['Front','Angle','Detail']),
  9:pngImageSet('cordless-screwdriver', ['Front','Angle']),
  10:pngImageSet('ceramic-pour-over-set', ['Front','Angle','Detail','In Box']),
  11:pngImageSet('trail-running-shoes', ['Front','Angle','Detail','In Box']),
  12:pngImageSet('cable-management-kit', ['Front','Angle','Detail','In Box']),
};

/* ── STATE ─────────────────────────────────────────────────────── */
const state = {
  cart: {},
  wishlist: new Set(),
  promoCode: null,
  promoDiscount: 0,
  currentStep: 1,
  expandedGallery: [],
  authUser: null,
  orders: [],
  productsLoaded: false,
  activeModal: null,
  lastFocus: null,
  csrfToken: null,
};

/* ── DOM ───────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── UTILS ─────────────────────────────────────────────────────── */
const fmt = n => '$' + Number(n).toFixed(2);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = value => new Date(value).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
const fmtDateTime = value => new Date(value).toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });

function svgUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function productPalette(cat) {
  const map = {
    tools:['#f97316','#fb7185'],
    electronics:['#3b82f6','#22d3ee'],
    home:['#10b981','#facc15'],
    lifestyle:['#a855f7','#fb7185'],
    outdoors:['#22c55e','#0ea5e9'],
  };
  return map[cat] || ['#4e7cff','#7b5ea7'];
}

function buildProductImage(p, label, tone = 0, subtitle = '') {
  const [a, b] = productPalette(p.cat);
  const bundle = subtitle || (PRODUCT_BUNDLES[p.id] || []).slice(0, 3).join(' • ');
  const baseX = [180, 210, 160, 200][tone % 4];
  const baseY = [175, 150, 205, 185][tone % 4];
  const rotate = [-10, 8, -16, 5][tone % 4];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${a}"/>
          <stop offset="100%" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="720" height="720" rx="44" fill="#0f172a"/>
      <circle cx="570" cy="120" r="120" fill="${a}" opacity=".14"/>
      <circle cx="120" cy="600" r="150" fill="${b}" opacity=".12"/>
      <rect x="54" y="54" width="612" height="612" rx="34" fill="url(#g)" opacity=".16"/>
      <g transform="translate(${baseX} ${baseY}) rotate(${rotate} 180 180)">
        <rect x="24" y="48" width="312" height="250" rx="34" fill="#f8fafc" opacity=".96"/>
        <rect x="64" y="84" width="232" height="176" rx="26" fill="url(#g)"/>
        <text x="180" y="188" text-anchor="middle" font-size="116">${esc(p.emoji)}</text>
      </g>
      <text x="62" y="98" fill="#f8fafc" font-family="Arial, sans-serif" font-size="26" font-weight="700">${esc(label)}</text>
      <text x="62" y="142" fill="#f8fafc" font-family="Arial, sans-serif" font-size="44" font-weight="700">${esc(p.name)}</text>
      <text x="62" y="182" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="22">${esc(p.cat.toUpperCase())}</text>
      <text x="62" y="582" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="24">${esc(bundle)}</text>
      <text x="62" y="624" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20">${esc(p.desc)}</text>
    </svg>`;
  return svgUri(svg);
}

function productGallery(p) {
  return PRODUCT_IMAGE_SETS[p.id] || [];
}

function productCardImage(p) {
  const gallery = productGallery(p);
  return gallery.length ? gallery[0] : null;
}

function imgAttrs(item, alt) {
  if (!item) return `alt="${alt}"`;
  const onerror = item.fallback ? `onerror="this.onerror=null;this.src='${item.fallback}'"` : '';
  return `src="${item.src}" alt="${alt}" ${onerror}`.trim();
}

function toast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  $('toastContainer').prepend(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function focusableEls(root) {
  return Array.from(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.disabled && el.offsetParent !== null);
}

function openModal(overlayId, initialFocusId) {
  state.lastFocus = document.activeElement;
  state.activeModal = overlayId;
  const overlay = $(overlayId);
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const target = initialFocusId ? $(initialFocusId) : focusableEls(overlay)[0];
  target && target.focus();
}

function closeModal(overlayId) {
  const overlay = $(overlayId);
  overlay.classList.add('hidden');
  if (state.activeModal === overlayId) state.activeModal = null;
  document.body.style.overflow = '';
  if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
    state.lastFocus.focus();
    state.lastFocus = null;
  }
}

function setStatus(msg, type) {
  const el = $('cartStatus');
  el.textContent = msg;
  el.className = 'cart__status' + (type ? ` cart__status--${type}` : '');
  if (msg) setTimeout(() => { el.textContent = ''; el.className = 'cart__status'; }, 3500);
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || '',
    last: parts.slice(1).join(' '),
  };
}

function authInitials(user) {
  const source = user?.name || user?.email || '?';
  const parts = String(source).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map(part => part[0]).join('').toUpperCase();
}

function setAuthMessage(id, msg = '') {
  $(id).textContent = msg;
}

function orderBadgeClass(stage) {
  if (stage === 'delivered') return 'order-badge order-badge--delivered';
  if (stage === 'out_for_delivery') return 'order-badge order-badge--delivery';
  if (stage === 'in_transit') return 'order-badge order-badge--transit';
  return 'order-badge order-badge--processing';
}

async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET','HEAD','OPTIONS'].includes(method) && path !== '/api/csrf' && !state.csrfToken) {
    await fetchCsrfToken();
  }
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(!['GET','HEAD','OPTIONS'].includes(method) && state.csrfToken ? { 'X-CSRF-Token': state.csrfToken } : {}),
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.path = path;
    throw error;
  }
  return data;
}

async function fetchCsrfToken() {
  const res = await fetch('/api/csrf', {
    method:'GET',
    credentials:'same-origin',
    headers:{ 'Accept':'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.csrfToken) throw new Error(data.error || 'Could not initialize secure session.');
  state.csrfToken = data.csrfToken;
}

async function loadProducts() {
  const data = await api('/api/products', { method:'GET' });
  PRODUCTS = data.products || [];
  state.productsLoaded = true;
  syncCartToInventory();
  renderProducts();
  renderCart();
}

function syncCartToInventory() {
  let changed = false;
  Object.entries(state.cart).forEach(([id, qty]) => {
    const product = PRODUCTS.find(entry => entry.id === Number(id));
    if (!product || product.stock <= 0) {
      delete state.cart[id];
      changed = true;
      return;
    }
    const safeQty = Math.min(qty, product.stock);
    if (safeQty !== qty) {
      state.cart[id] = safeQty;
      changed = true;
    }
  });
  if (changed) saveCart();
}

function fillCheckoutFromUser() {
  const user = state.authUser;
  if (!user) return;
  const { first, last } = splitName(user.name);
  if (!$('f_first').value.trim()) $('f_first').value = first;
  if (!$('f_last').value.trim()) $('f_last').value = last;
  if (!$('f_email').value.trim()) $('f_email').value = user.email || '';
}

function renderAuth() {
  const user = state.authUser;
  $('authAvatar').textContent = authInitials(user);
  $('authLabel').textContent = user ? 'Signed In' : 'Account';
  $('authName').textContent = user ? (user.name || user.email) : 'Sign In';
  $('authGuestView').style.display = user ? 'none' : '';
  $('authUserView').style.display = user ? '' : 'none';
  $('accountDisplayName').textContent = user ? (user.name || 'Account') : '';
  $('accountDisplayEmail').textContent = user ? user.email : '';
  if (user) fillCheckoutFromUser();
}

function showAuthTab(tab) {
  const login = tab === 'login';
  $('showLoginBtn').classList.toggle('active', login);
  $('showRegisterBtn').classList.toggle('active', !login);
  $('loginPanel').classList.toggle('active', login);
  $('registerPanel').classList.toggle('active', !login);
  setAuthMessage('loginError');
  setAuthMessage('registerError');
}

function openAuth(tab = 'login') {
  showAuthTab(tab);
  openModal('authOverlay', tab === 'login' ? 'loginEmail' : 'registerName');
}

function closeAuth() {
  closeModal('authOverlay');
}

async function hydrateAuth() {
  try {
    const data = await api('/api/auth/me', { method:'GET' });
    state.authUser = data.user || null;
  } catch {
    state.authUser = null;
  }
  renderAuth();
  await loadOrders();
}

async function login() {
  setAuthMessage('loginError');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  if (!email || !password) {
    setAuthMessage('loginError', 'Enter your email and password.');
    return;
  }
  const btn = $('loginSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Signing In...';
  try {
    const data = await api('/api/auth/login', {
      method:'POST',
      body: JSON.stringify({ email, password }),
    });
    state.authUser = data.user;
    renderAuth();
    await loadOrders();
    closeAuth();
    toast(`Welcome back, ${data.user.name || data.user.email}!`, 'success');
  } catch (err) {
    setAuthMessage('loginError', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function register() {
  setAuthMessage('registerError');
  const name = $('registerName').value.trim();
  const email = $('registerEmail').value.trim();
  const password = $('registerPassword').value;
  if (!name || !email || !password) {
    setAuthMessage('registerError', 'Fill in your name, email, and password.');
    return;
  }
  const btn = $('registerSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Creating Account...';
  try {
    const data = await api('/api/auth/register', {
      method:'POST',
      body: JSON.stringify({ name, email, password }),
    });
    state.authUser = data.user;
    renderAuth();
    await loadOrders();
    closeAuth();
    toast(`Account created for ${data.user.email}`, 'success');
  } catch (err) {
    setAuthMessage('registerError', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function logout() {
  const btn = $('logoutBtn');
  btn.disabled = true;
  btn.textContent = 'Signing Out...';
  try {
    await api('/api/auth/logout', { method:'POST', body: JSON.stringify({}) });
  } catch {}
  state.authUser = null;
  state.orders = [];
  renderAuth();
  renderOrders();
  closeAuth();
  toast('Signed out successfully.', 'info');
  btn.disabled = false;
  btn.textContent = 'Sign Out';
}

/* ── PRODUCT RENDERING ─────────────────────────────────────────── */
function getFiltered() {
  const q   = $('searchInput').value.trim().toLowerCase();
  const cat = $('categoryFilter').value;
  const srt = $('sortSelect').value;
  let list  = PRODUCTS.filter(p => {
    const mq  = !q   || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.cat.includes(q);
    const mc  = !cat || p.cat === cat;
    return mq && mc;
  });
  if (srt === 'price-asc')  list.sort((a,b) => a.price - b.price);
  if (srt === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (srt === 'name-asc')   list.sort((a,b) => a.name.localeCompare(b.name));
  if (srt === 'discount')   list.sort((a,b) => {
    const da = a.compare ? (a.compare-a.price)/a.compare : 0;
    const db = b.compare ? (b.compare-b.price)/b.compare : 0;
    return db - da;
  });
  return list;
}

function hl(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function stockHtml(s) {
  if (s === 0) return `<span class="sdot sdot--red"></span><span style="color:#f87171">Out of stock</span>`;
  if (s <= 5)  return `<span class="sdot sdot--yellow"></span><span style="color:#facc15">Only ${s} left</span>`;
  return `<span class="sdot sdot--green"></span><span style="color:var(--green)">In stock</span>`;
}

function renderProducts() {
  const q    = $('searchInput').value.trim().toLowerCase();
  const list = getFiltered();
  const grid = $('productGrid');
  grid.innerHTML = '';
  if (!state.productsLoaded) {
    $('catalogResults').textContent = 'Loading products...';
    grid.innerHTML = `<div class="catalog-empty"><span class="catalog-empty__icon">⏳</span><h3>Loading catalogue</h3><p>Pulling the latest products and stock levels from the server.</p></div>`;
    return;
  }
  $('catalogResults').textContent = `${list.length} product${list.length!==1?'s':''} found`;
  const wl = state.wishlist.size;
  $('wishlistCount').innerHTML = wl ? `<span>${wl}</span> item${wl!==1?'s':''} wishlisted ♡` : '';

  if (!list.length) {
    grid.innerHTML = `<div class="catalog-empty"><span class="catalog-empty__icon">🔍</span><h3>Nothing found</h3><p>Try different search terms or filters.</p></div>`;
    return;
  }

  list.forEach((p, i) => {
    const savings   = p.compare ? Math.round((p.compare-p.price)/p.compare*100) : 0;
    const isFav     = state.wishlist.has(p.id);
    const outOfStock= p.stock === 0;
    const qty       = 1;

    const card = document.createElement('div');
    card.className = 'product';
    card.dataset.id = p.id;
    card.style.animationDelay = `${i * 0.055}s`;

    card.innerHTML = `
      ${p.badge ? `<span class="product__badge badge--${p.badge}">${p.badge==='sale'?`-${savings}%`:p.badge}</span>` : ''}
      <button class="product__fav ${isFav?'active':''}" data-fav="${p.id}" aria-pressed="${isFav}" aria-label="${isFav?'Remove from':'Save to'} wishlist">
        ${isFav ? '★' : '☆'}
      </button>
      <div class="product__img-wrap">
        <img class="product__img" ${imgAttrs(productCardImage(p), `${p.name} product image`)}/>
      </div>
      <div class="product__body">
        <div class="product__cat">${p.cat}</div>
        <h3 class="product__title">${hl(p.name, q)}</h3>
        <p class="product__desc">${hl(p.desc, q)}</p>
        <div class="product__pricing">
          <span class="product__price">${fmt(p.price)}</span>
          ${p.compare ? `<span class="product__compare">${fmt(p.compare)}</span><span class="product__savings">Save ${savings}%</span>` : ''}
        </div>
        <div class="product__stock">${stockHtml(p.stock)}</div>
        <div class="product__actions">
          <div class="qty-ctrl">
            <button data-dec="${p.id}" aria-label="Decrease">−</button>
            <span id="qty-${p.id}">1</span>
            <button data-inc="${p.id}" aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary product__add" data-add="${p.id}" ${outOfStock?'disabled':''}>
            ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ── CART ──────────────────────────────────────────────────────── */
function calcCart() {
  const entries = Object.entries(state.cart);
  let sub = 0;
  entries.forEach(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === +id);
    if (p) sub += p.price * qty;
  });
  const disc  = sub * state.promoDiscount;
  const tax   = (sub - disc) * 0.08;
  const total = sub - disc + tax;
  const count = entries.reduce((a,[,q]) => a+q, 0);
  return { sub, disc, tax, total, count };
}

function renderCart() {
  const { sub, disc, tax, total, count } = calcCart();
  const entries = Object.entries(state.cart).filter(([,q]) => q > 0);

  $('cartEmpty').style.display   = entries.length ? 'none' : '';
  $('cartItems').style.display   = entries.length ? ''     : 'none';
  $('checkoutBtn').disabled      = !entries.length;

  // Animate count badge
  const prev = +$('cartCount').textContent;
  if (prev !== count) {
    $('cartCount').classList.remove('bump');
    void $('cartCount').offsetWidth;
    $('cartCount').classList.add('bump');
  }
  $('cartCount').textContent = count;
  $('cartBadge').textContent = count;

  // Build items
  $('cartItems').innerHTML = '';
  entries.forEach(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === +id);
    if (!p) return;
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <span class="cart-item__emoji">${p.emoji}</span>
      <div class="cart-item__info">
        <div class="cart-item__name">${p.name}</div>
        <div class="cart-item__meta">Qty ${qty} × ${fmt(p.price)}</div>
      </div>
      <span class="cart-item__price">${fmt(p.price * qty)}</span>
      <button class="cart-item__remove" data-remove="${p.id}" aria-label="Remove ${p.name}">×</button>`;
    $('cartItems').appendChild(li);
  });

  $('cartSubtotal').textContent = fmt(sub);
  $('cartDiscount').textContent = disc > 0 ? `-${fmt(disc)}` : '—';
  $('cartTax').textContent      = fmt(tax);
  $('cartTotal').textContent    = fmt(total);
}

function addToCart(id, qty) {
  const p = PRODUCTS.find(x => x.id === +id);
  if (!p || p.stock === 0) return;
  const cur = state.cart[id] || 0;
  const add = Math.min(qty, p.stock - cur);
  if (add <= 0) { toast(`Max stock reached for ${p.name}`, 'error'); return; }
  state.cart[id] = cur + add;
  saveCart();
  renderCart();
  toast(`${p.emoji} ${p.name} added to cart!`, 'success');
  openCart();
}

function removeFromCart(id) {
  const p = PRODUCTS.find(x => x.id === +id);
  delete state.cart[id];
  saveCart();
  renderCart();
  setStatus('Item removed.', 'err');
  if (p) toast(`${p.emoji} ${p.name} removed`, 'info');
}

function changeQty(id, delta) {
  const p  = PRODUCTS.find(x => x.id === +id);
  const el = $(`qty-${id}`);
  if (!el || !p) return;
  let cur = parseInt(el.textContent) || 1;
  cur = Math.max(1, Math.min(p.stock || 9, cur + delta));
  el.textContent = cur;
}

/* ── PROMO ─────────────────────────────────────────────────────── */
function applyPromo() {
  const code = $('promoInput').value.trim().toUpperCase();
  if (!code) return;
  if (PROMOS[code] !== undefined) {
    state.promoCode     = code;
    state.promoDiscount = PROMOS[code];
    $('promoApplied').textContent = `✅ Code "${code}" applied — ${Math.round(PROMOS[code]*100)}% off!`;
    $('promoApplied').style.display = '';
    $('promoInput').disabled  = true;
    $('promoBtn').disabled    = true;
    renderCart();
    toast(`🎉 Promo code ${code} applied!`, 'success');
  } else {
    toast('Invalid code. Try FORWARD20, SAVE10, or HIRESH5', 'error');
    $('promoInput').style.borderColor = 'var(--accent)';
    setTimeout(() => $('promoInput').style.borderColor = '', 1800);
  }
}

/* ── EXPANDED VIEW ─────────────────────────────────────────────── */
function openExpanded(p) {
  const savings = p.compare ? Math.round((p.compare - p.price) / p.compare * 100) : 0;
  const stockLabel = p.stock === 0 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock';
  const gallery = productGallery(p);
  state.expandedGallery = gallery;
  const boxItems = PRODUCT_BUNDLES[p.id] || ['Main product','Accessory set','Manual','Storage pack'];
  $('expandedContent').innerHTML = `
    <div class="expanded-product">
      <div class="expanded-gallery">
        <div class="expanded-thumbs">
          ${gallery.map((item, index) => `
            <button class="expanded-thumb ${index === 0 ? 'active' : ''}" data-gallery-index="${index}" aria-label="Show ${item.label} image">
              <img ${imgAttrs(item, `${p.name} ${item.label.toLowerCase()}`)}/>
            </button>`).join('')}
        </div>
        <div class="expanded-product__visual">
          <img id="expandedMainImage" ${imgAttrs(gallery[0], `${p.name} front view`)}/>
        </div>
      </div>
      <div>
        <div class="expanded-product__meta">
          <span class="expanded-pill">${p.cat}</span>
          ${p.badge ? `<span class="expanded-pill">${p.badge}</span>` : ''}
        </div>
        <h1>${p.name}</h1>
        <p class="expanded-copy">${p.desc}</p>
        <div class="expanded-price">
          <strong>${fmt(p.price)}</strong>
          ${p.compare ? `<span class="product__compare">${fmt(p.compare)}</span><span class="product__savings">Save ${savings}%</span>` : ''}
        </div>
        <div class="expanded-grid">
          <div class="expanded-detail"><span>Availability</span><strong>${stockLabel}</strong></div>
          <div class="expanded-detail"><span>Product ID</span><strong>#${p.id}</strong></div>
          <div class="expanded-detail"><span>Category</span><strong>${p.cat}</strong></div>
          <div class="expanded-detail"><span>Why people buy it</span><strong>Simple, practical, and ready to use</strong></div>
        </div>
        <h3 class="expanded-section-title">What's In The Box</h3>
        <div class="expanded-box">
          ${boxItems.map(item => `<div class="expanded-box-item">${item}</div>`).join('')}
        </div>
        <div class="expanded-actions">
          <button class="btn btn--primary" data-expanded-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
          <button class="btn btn--secondary" id="expandedDismiss">Keep Browsing</button>
        </div>
      </div>
    </div>`;
  $('expandedView').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeExpanded() {
  $('expandedView').classList.remove('active');
  document.body.style.overflow = '';
}

async function loadOrders() {
  if (!state.authUser) {
    state.orders = [];
    renderOrders();
    return;
  }
  try {
    const data = await api('/api/orders', { method:'GET' });
    state.orders = data.orders || [];
  } catch {
    state.orders = [];
  }
  renderOrders();
}

function renderOrders() {
  const host = $('ordersContent');
  if (!state.authUser) {
    host.innerHTML = `<div class="orders-empty">Sign in to see your active deliveries, expected arrival dates, and previous delivered orders.</div>`;
    return;
  }
  if (!state.orders.length) {
    host.innerHTML = `<div class="orders-empty">You have not placed any orders yet. Once you check out, they will appear here with live delivery progress.</div>`;
    return;
  }
  const activeCount = state.orders.filter(order => order.tracking.stage !== 'delivered').length;
  const deliveredCount = state.orders.length - activeCount;
  const latestEta = state.orders
    .map(order => order.tracking.estimatedDelivery)
    .filter(Boolean)
    .sort()[0];
  host.innerHTML = `
    <section class="orders-shell">
      <div class="orders-hero">
        <div class="orders-hero__eyebrow">Order Hub</div>
        <h3 class="orders-hero__title">Every order, every stop, all in one place.</h3>
        <p class="orders-hero__copy">Track what is on the way, see where it is right now, and revisit delivered orders without leaving the storefront.</p>
      </div>
      <div class="orders-summary">
        <div class="orders-summary__card">
          <div class="orders-summary__value">${state.orders.length}</div>
          <div class="orders-summary__label">Total Orders</div>
        </div>
        <div class="orders-summary__card">
          <div class="orders-summary__value">${activeCount}</div>
          <div class="orders-summary__label">Still Moving</div>
        </div>
        <div class="orders-summary__card">
          <div class="orders-summary__value">${deliveredCount}</div>
          <div class="orders-summary__label">Delivered</div>
        </div>
        <div class="orders-summary__card">
          <div class="orders-summary__value">${latestEta ? fmtDate(latestEta) : 'Done'}</div>
          <div class="orders-summary__label">Next Arrival</div>
        </div>
      </div>
      ${state.orders.map(order => {
        const progressIndex = {
          processing: 0,
          in_transit: 1,
          out_for_delivery: 2,
          delivered: 3,
        }[order.tracking.stage] ?? 0;
        const progressSteps = [
          ['Placed', 'Your order has been confirmed.'],
          ['In Transit', 'Moving through the shipping network.'],
          ['Out Today', 'Last-mile delivery is in progress.'],
          ['Delivered', 'Package has reached the destination.'],
        ];
        return `
    <article class="order-card">
      <div class="order-card__top">
        <div>
          <div class="order-card__id">${order.id}</div>
          <div class="order-card__meta">Placed ${fmtDateTime(order.createdAt)}</div>
        </div>
        <span class="${orderBadgeClass(order.tracking.stage)}">${order.tracking.label}</span>
      </div>
      <p class="order-card__lead">${order.tracking.stage === 'delivered' ? `Delivered successfully in ${esc(order.shipping.city)}.` : `Currently at ${esc(order.tracking.location)} and expected by ${fmtDate(order.tracking.estimatedDelivery)}.`}</p>
      <div class="order-grid">
        <div class="order-stat">
          <span>Current Status</span>
          <strong>${order.tracking.label}</strong>
        </div>
        <div class="order-stat">
          <span>Current Location</span>
          <strong>${order.tracking.location}</strong>
        </div>
        <div class="order-stat">
          <span>Expected Delivery</span>
          <strong>${order.tracking.estimatedDelivery ? fmtDate(order.tracking.estimatedDelivery) : 'Delivered'}</strong>
        </div>
        <div class="order-stat">
          <span>Delivered On</span>
          <strong>${order.tracking.deliveredAt ? fmtDate(order.tracking.deliveredAt) : 'Not delivered yet'}</strong>
        </div>
      </div>
      <div class="order-progress">
        ${progressSteps.map((step, index) => `
          <div class="order-progress__step ${index < progressIndex ? 'is-complete' : index === progressIndex ? 'is-active' : ''}">
            <div class="order-progress__dot"></div>
            <div class="order-progress__title">${step[0]}</div>
            <div class="order-progress__copy">${step[1]}</div>
          </div>
        `).join('')}
      </div>
      <div class="order-items">
        <div class="order-items__title">Items in this shipment</div>
        ${order.items.map(item => `
          <div class="order-item">
            <span>${esc(item.name)} x${item.qty}</span>
            <strong>${fmt(item.lineTotal)}</strong>
          </div>`).join('')}
      </div>
      <div class="order-footer">
        <div class="order-footer__meta">Shipping via ${esc(order.shipping.methodLabel)} to ${esc(order.shipping.city)}, ${esc(order.shipping.postalCode)}</div>
        <div class="order-footer__total">Total ${fmt(order.pricing.total)}</div>
      </div>
    </article>
  `;
      }).join('')}
    </section>
  `;
}

async function openOrders() {
  if (!state.authUser) {
    toast('Sign in to view your orders.', 'info');
    openAuth('login');
    return;
  }
  $('checkoutOverlay').classList.add('hidden');
  await loadOrders();
  openModal('ordersOverlay', 'ordersClose');
}

function closeOrders() {
  closeModal('ordersOverlay');
}

function setExpandedImage(index) {
  const item = state.expandedGallery[index];
  const main = $('expandedMainImage');
  if (!item || !main) return;
  main.src = item.src;
  main.alt = item.label;
  main.onerror = () => {
    main.onerror = null;
    main.src = item.fallback;
  };
  document.querySelectorAll('.expanded-thumb').forEach((thumb, thumbIndex) => {
    thumb.classList.toggle('active', thumbIndex === index);
  });
}

/* ── CART UI ───────────────────────────────────────────────────── */
function openCart()   { $('cartPanel').classList.remove('cart--hidden'); }
function closeCart()  { $('cartPanel').classList.add('cart--hidden'); }
function toggleCart() { $('cartPanel').classList.toggle('cart--hidden'); }

/* ── WISHLIST ──────────────────────────────────────────────────── */
function toggleWishlist(id) {
  const p = PRODUCTS.find(x => x.id === +id);
  if (!p) return;
  if (state.wishlist.has(+id)) {
    state.wishlist.delete(+id);
    toast(`${p.emoji} Removed from wishlist`, 'info');
  } else {
    state.wishlist.add(+id);
    toast(`${p.emoji} Added to wishlist ★`, 'info');
  }
  renderProducts();
}

/* ── CHECKOUT ──────────────────────────────────────────────────── */
function openCheckout() {
  if (!state.authUser) {
    toast('Sign in to continue to checkout.', 'info');
    openAuth('login');
    return;
  }
  fillCheckoutFromUser();
  goToStep(1);
  // Reset modal title & sub
  $('modalTitle').textContent = 'Checkout';
  $('modalSub').textContent   = 'Complete your order below. All fields required.';
  $('stepsBar').style.display = '';
  $('panelSuccess').classList.remove('active');
  openModal('checkoutOverlay', 'f_first');
}

function closeCheckout() {
  closeModal('checkoutOverlay');
}

function goToStep(n) {
  state.currentStep = n;
  [1,2,3].forEach(i => {
    const panel = $(`panel${i}`);
    const stepEl= $(`step${i}El`);
    const dot   = $(`dot${i}`);
    if (!panel || !stepEl || !dot) return;
    panel.classList.toggle('active', i === n);
    stepEl.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
    dot.textContent  = i < n ? '✓' : String(i);
  });
}

function buildOrderReview() {
  const { sub, disc, tax, total } = calcCart();
  const entries = Object.entries(state.cart).filter(([,q]) => q > 0);
  let html = '<h3>Order Summary</h3>';
  entries.forEach(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === +id);
    if (p) html += `<div class="order-review-item"><span>${p.emoji} ${p.name} ×${qty}</span><span>${fmt(p.price*qty)}</span></div>`;
  });
  if (disc > 0) html += `<div class="order-review-item"><span>Discount (${state.promoCode})</span><span style="color:var(--green)">-${fmt(disc)}</span></div>`;
  html += `<div class="order-review-total"><span>Total (incl. tax)</span><span>${fmt(total)}</span></div>`;
  $('orderReview').innerHTML = html;
}

function validateStep(n) {
  const map = {
    1: ['f_first','f_last','f_email','f_phone'],
    2: ['f_addr','f_city','f_zip'],
    3: ['f_cname','f_card','f_exp','f_cvv'],
  };
  for (const id of map[n]) {
    const el = $(id);
    if (!el || !el.value.trim()) {
      el && el.focus();
      if (el) { el.style.borderColor = 'var(--accent)'; setTimeout(() => el.style.borderColor='', 1800); }
      toast('Please fill in all required fields.', 'error');
      return false;
    }
  }
  if (n === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('f_email').value.trim())) { toast('Enter a valid email address.', 'error'); return false; }
  if (n === 1 && $('f_phone').value.replace(/\D/g,'').length < 10) { toast('Enter a valid phone number.', 'error'); return false; }
  if (n === 2 && $('f_zip').value.trim().length < 4) { toast('Enter a valid postal code.', 'error'); return false; }
  if (n === 3 && $('f_card').value.replace(/\s/g,'').length < 15) { toast('Enter a valid card number.', 'error'); return false; }
  if (n === 3 && !/^(0[1-9]|1[0-2])\/\d{2}$/.test($('f_exp').value.trim())) { toast('Enter a valid expiry in MM/YY format.', 'error'); return false; }
  if (n === 3 && $('f_cvv').value.replace(/\D/g,'').length < 3) { toast('Enter a valid CVV.', 'error'); return false; }
  return true;
}

async function placeOrder() {
  if (!validateStep(3)) return;
  const btn = $('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Processing…';

  try {
    const { sub, disc, tax, total } = calcCart();
    const entries = Object.entries(state.cart).filter(([,q]) => q > 0);
    const items = entries.map(([id, qty]) => {
      const p = PRODUCTS.find(x => x.id === +id);
      return {
        productId: p.id,
        name: p.name,
        qty,
        unitPrice: p.price,
      };
    });
    const shippingMap = {
      standard: { label:'Standard (5-7 days)', fee:0 },
      express: { label:'Express (2-3 days)', fee:9.99 },
      overnight: { label:'Overnight (1 day)', fee:24.99 },
    };
    const shipping = shippingMap[$('f_shipping').value] || shippingMap.standard;
    const order = await api('/api/orders', {
      method:'POST',
      body: JSON.stringify({
        items,
        pricing: { subtotal:sub, discount:disc, tax, total },
        contact: {
          firstName:$('f_first').value.trim(),
          lastName:$('f_last').value.trim(),
          email:$('f_email').value.trim(),
          phone:$('f_phone').value.trim(),
        },
        shipping: {
          method:$('f_shipping').value,
          methodLabel:shipping.label,
          fee:shipping.fee,
          address:$('f_addr').value.trim(),
          city:$('f_city').value.trim(),
          postalCode:$('f_zip').value.trim(),
        },
      }),
    });

    $('orderIdDisplay').textContent = `Order ID: ${order.order.id}`;
    // Hide all step panels
    ['panel1','panel2','panel3'].forEach(id => $(id).classList.remove('active'));
    $('panelSuccess').classList.add('active');
    $('modalTitle').textContent = 'Order Confirmed! 🎉';
    $('modalSub').textContent   = '';
    $('stepsBar').style.display = 'none';

    // Clear cart & promo
    state.cart = {};
    state.promoCode = null;
    state.promoDiscount = 0;
    $('promoApplied').style.display = 'none';
    $('promoInput').disabled  = false;
    $('promoInput').value     = '';
    $('promoBtn').disabled    = false;
    saveCart();
    renderCart();
    await loadProducts();
    await loadOrders();
    closeCart();
    toast('🎉 Order placed successfully!', 'success');
  } catch (err) {
    if (err.path === '/api/orders' && err.status === 404) {
      toast('Orders API not found. Restart the backend server and try again.', 'error');
    } else {
      toast(err.message || 'Could not place order right now.', 'error');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place Order 🎉';
  }
}

/* ── PERSISTENCE ───────────────────────────────────────────────── */
function saveCart() {
  try { sessionStorage.setItem('fif_cart', JSON.stringify(state.cart)); } catch {}
}
function loadCart() {
  try {
    const saved = sessionStorage.getItem('fif_cart');
    if (saved) Object.assign(state.cart, JSON.parse(saved));
  } catch {}
}

/* ── CARD NUMBER & EXPIRY FORMATTING ───────────────────────────── */
document.addEventListener('input', e => {
  if (e.target.id === 'f_card') {
    let v = e.target.value.replace(/\D/g,'').slice(0,16);
    e.target.value = v.replace(/(.{4})/g,'$1 ').trim();
  }
  if (e.target.id === 'f_exp') {
    let v = e.target.value.replace(/\D/g,'').slice(0,4);
    if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
    e.target.value = v;
  }
  if (e.target.id === 'f_phone' || e.target.id === 'f_cvv' || e.target.id === 'f_zip') {
    e.target.value = e.target.value.replace(/[^\d+\-\s]/g,'');
  }
});

/* ── EVENT DELEGATION ──────────────────────────────────────────── */
document.addEventListener('click', e => {
  if (e.target.closest('#authTriggerBtn')) { openAuth(state.authUser ? 'login' : 'login'); return; }
  if (e.target.closest('#authClose') || e.target === $('authOverlay') || e.target.closest('#authCloseUserBtn')) { closeAuth(); return; }
  if (e.target.closest('#ordersClose') || e.target === $('ordersOverlay')) { closeOrders(); return; }
  if (e.target.closest('#showLoginBtn')) { showAuthTab('login'); return; }
  if (e.target.closest('#showRegisterBtn')) { showAuthTab('register'); return; }
  if (e.target.closest('#loginSubmitBtn')) { login(); return; }
  if (e.target.closest('#registerSubmitBtn')) { register(); return; }
  if (e.target.closest('#logoutBtn')) { logout(); return; }
  // Add to cart
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) {
    const id  = +addBtn.dataset.add;
    const qEl = $(`qty-${id}`);
    addToCart(id, qEl ? parseInt(qEl.textContent) || 1 : 1);
    return;
  }
  // Wishlist toggle
  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) { toggleWishlist(+favBtn.dataset.fav); return; }
  // Remove from cart
  const remBtn = e.target.closest('[data-remove]');
  if (remBtn) { removeFromCart(+remBtn.dataset.remove); return; }
  // Qty +/-
  const inc = e.target.closest('[data-inc]');
  if (inc) { changeQty(+inc.dataset.inc,  1); return; }
  const dec = e.target.closest('[data-dec]');
  if (dec) { changeQty(+dec.dataset.dec, -1); return; }
  // Expanded gallery image switch
  const galleryThumb = e.target.closest('[data-gallery-index]');
  if (galleryThumb) {
    setExpandedImage(+galleryThumb.dataset.galleryIndex);
    return;
  }
  // Expanded add to cart
  const expandedAdd = e.target.closest('[data-expanded-add]');
  if (expandedAdd) {
    addToCart(+expandedAdd.dataset.expandedAdd, 1);
    closeExpanded();
    return;
  }
  // Product expand
  if (e.target.closest('.product') && !e.target.closest('[data-add], [data-fav], [data-dec], [data-inc], .qty-ctrl, .product__add')) {
    const id = +e.target.closest('.product').dataset.id;
    const p = PRODUCTS.find(x => x.id === id);
    if (p) openExpanded(p);
    return;
  }
  // Cart open/toggle
  if (e.target.closest('#headerCartBtn') || e.target.closest('#navCartLink')) { e.preventDefault(); toggleCart(); return; }
  if (e.target.closest('#viewOrdersBtn')) { e.preventDefault(); closeCheckout(); openOrders(); return; }
  if (e.target.closest('#navOrdersLink')) { e.preventDefault(); openOrders(); return; }
  if (e.target.closest('#cartClose')) { closeCart(); return; }
  // Hero scroll
  if (e.target.closest('#heroShopBtn')) { $('catalog').scrollIntoView({ behavior:'smooth' }); return; }
  // Open checkout
  if (e.target.closest('#checkoutBtn')) { openCheckout(); return; }
  // Close modal
  if (e.target.closest('#modalClose') || e.target === $('checkoutOverlay')) { closeCheckout(); return; }
  // Checkout steps
  if (e.target.closest('#next1Btn')) { if (validateStep(1)) goToStep(2); return; }
  if (e.target.closest('#next2Btn')) { if (validateStep(2)) { goToStep(3); buildOrderReview(); } return; }
  if (e.target.closest('#back1Btn')) { goToStep(1); return; }
  if (e.target.closest('#back2Btn')) { goToStep(2); return; }
  if (e.target.closest('#placeOrderBtn')) { placeOrder(); return; }
  if (e.target.closest('#closeSuccessBtn')) { closeCheckout(); return; }
  // Expanded close
  if (e.target.closest('#expandedClose') || e.target.closest('#expandedDismiss') || e.target === $('expandedView')) { closeExpanded(); return; }
  // Promo
  if (e.target.closest('#promoBtn')) { applyPromo(); return; }
  // Nav toggle
  if (e.target.closest('#navToggle')) {
    const menu = $('navMenu');
    const open = menu.classList.toggle('open');
    $('navToggle').setAttribute('aria-expanded', open);
    return;
  }
  // Close nav on link
  if (e.target.closest('.nav__list a:not(#navCartLink)')) {
    $('navMenu').classList.remove('open');
    $('navToggle').setAttribute('aria-expanded','false');
  }
});

// Promo Enter key
$('promoInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyPromo(); });

// Search / filter / sort
$('searchInput').addEventListener('input', renderProducts);
$('categoryFilter').addEventListener('change', renderProducts);
$('sortSelect').addEventListener('change', renderProducts);

// Escape closes everything
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeOrders(); closeCheckout(); closeCart(); closeExpanded(); }
  if (e.key === 'Tab' && state.activeModal) {
    const overlay = $(state.activeModal);
    if (!overlay || overlay.classList.contains('hidden')) return;
    const nodes = focusableEls(overlay);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

['loginEmail','loginPassword'].forEach(id => {
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
});
['registerName','registerEmail','registerPassword'].forEach(id => {
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') register(); });
});

/* ── INIT ──────────────────────────────────────────────────────── */
$('footerYear').textContent = new Date().getFullYear();
loadCart();
renderAuth();
renderProducts();
renderCart();
fetchCsrfToken().catch(() => {});
loadProducts().catch(() => {
  state.productsLoaded = true;
  $('catalogResults').textContent = 'Could not load products';
  $('productGrid').innerHTML = `<div class="catalog-empty"><span class="catalog-empty__icon">⚠️</span><h3>Catalogue unavailable</h3><p>Start the backend server to load products and live stock.</p></div>`;
});
hydrateAuth();

console.log('%c Fix-It Forward Shop ', 'font-size:16px;font-weight:bold;background:#4e7cff;color:#fff;border-radius:6px;padding:4px 10px');
console.log('%c Submitted by Amogh & Hiresh ✨', 'color:#a78bfa;font-size:13px');
