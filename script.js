/* cart + checkout logic for ballard bread lab */

/* PUBLIC ENDPOINT for your Vercel backend API */
const CHECKOUT_ENDPOINT = "https://bbl-rho.vercel.app/api/create-checkout";

/* ---------------- CART STATE ---------------- */

function loadCart() {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// simple cart: key = item name -> { price, qty }
const cart = {};

/**
 * Add one of an item to the cart.
 * Called from inline onclick attributes in index.html.
 */
function addToCart(name, price) {
  price = Number(price);
  if (!cart[name]) cart[name] = { price, qty: 0 };
  cart[name].qty += 1;
  renderCartItems();
  updateCartTotal();
}

/**
 * Decrement one of an item (remove when qty reaches 0).
 */
function removeOneFromCart(name) {
  if (!cart[name]) return;
  cart[name].qty -= 1;
  if (cart[name].qty <= 0) delete cart[name];
  renderCartItems();
  updateCartTotal();
}

/**
 * Render cart items into #cartItems element.
 */
function renderCartItems() {
  const container = document.getElementById('cartItems');
  if (!container) return;
  container.innerHTML = '';

  const names = Object.keys(cart);
  if (names.length === 0) {
    container.classList.add('empty-msg');
    container.textContent = 'Cart is empty.';
    return;
  }

  container.classList.remove('empty-msg');

  names.forEach(name => {
    const item = cart[name];
    const row = document.createElement('div');
    row.className = 'summary-item';
    row.innerHTML = `
      <div style="display:flex;gap:.5rem;align-items:center;">
        <div>${name}</div>
        <div style="opacity:.8;font-size:.95rem;">× ${item.qty}</div>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center;">
        <div>$${(item.price * item.qty).toFixed(2)}</div>
        <button class="alt-btn" aria-label="remove one ${name}">−</button>
      </div>
    `;
    const btn = row.querySelector('button');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeOneFromCart(name);
    });
    container.appendChild(row);
  });
}

/**
 * Update total in #cartTotal (and any other summary totals).
 */
function updateCartTotal() {
  const totalEl = document.getElementById('cartTotal');
  let total = 0;
  Object.values(cart).forEach(i => total += i.price * i.qty);
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

/* ---------------- PICKUP WINDOW ---------------- */

let selectedPickupWindow = {
  code: "afternoon",
  label: "Afternoon Batch",
  time: "3 PM – 4 PM",
  hint: "orders in before 12 PM"
};

function setPickupWindow(code) {
  // midnight is allowed
  const map = {
    afternoon: {
      label: "Afternoon Batch",
      time: "3 PM – 4 PM",
      hint: "orders in before 12 PM"
    },
    evening: {
      label: "Evening Batch",
      time: "6 PM – 7 PM",
      hint: "orders in before 3 PM"
    },
    night: {
      label: "Night Batch",
      time: "9 PM – 10 PM",
      hint: "orders in before 6 PM"
    },
    midnight: {
      label: "Midnight Batch",
      time: "12 AM – 1 AM",
      hint: "pickup ok"
    }
  };

  if (!map[code]) return;

  selectedPickupWindow = {
    code,
    label: map[code].label,
    time: map[code].time,
    hint: map[code].hint
  };
}

function pickupWindowSummary() {
  return `${selectedPickupWindow.label} | ${selectedPickupWindow.time}`;
}

/* ---------------- RENDER CART ---------------- */

/**
 * Remove item by its index in the stored cart array.
 * (keeps compatibility with any existing removeByIndex calls)
 */
function removeFromCart(index) {
  const stored = loadCart();
  if (!Array.isArray(stored)) return;
  if (index < 0 || index >= stored.length) return;
  stored.splice(index, 1);
  saveCart(stored);
  renderCart();
}

/**
 * Remove one occurrence of an item by name (used by grouped UI).
 */
function removeFromCartByName(name) {
  const stored = loadCart();
  const idx = stored.findIndex(i => i.name === name);
  if (idx === -1) return;
  stored.splice(idx, 1);
  saveCart(stored);
  renderCart();
}

/**
 * Render cart with quantity aggregation (keeps same markup/classes).
 */
function renderCart() {
  const stored = loadCart(); // stored is an array of items { name, price, ... }
  const cartItemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");

  if (!cartItemsEl || !totalEl) return;

  if (!stored || stored.length === 0) {
    cartItemsEl.classList.add("empty-msg");
    cartItemsEl.innerHTML = "Cart is empty.";
    totalEl.textContent = "0.00";
    return;
  }

  cartItemsEl.classList.remove("empty-msg");

  // aggregate by name
  const groups = stored.reduce((acc, item) => {
    const key = item.name;
    if (!acc[key]) acc[key] = { name: item.name, price: item.price, qty: 0 };
    acc[key].qty += 1;
    return acc;
  }, {});

  // build lines keeping the same classes (cart-line / cart-line-title / cart-line-sub)
  const lines = Object.values(groups).map(group => {
    const safeName = String(group.name).replace(/'/g, "\\'");
    return `
      <div class="cart-line">
        <div>
          <div class="cart-line-title">${group.name} <span style="opacity:.8;font-size:.95rem;">× ${group.qty}</span></div>
          <div class="cart-line-sub">$${group.price.toFixed(2)}</div>
        </div>
        <button class="remove-btn" onclick="removeFromCartByName('${safeName}')">
          remove
        </button>
      </div>
    `;
  }).join("");

  cartItemsEl.innerHTML = lines;

  // compute total from stored array to preserve any duplicates/pricing logic
  const total = (stored || []).reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  totalEl.textContent = total.toFixed(2);
}

/* ---------------- MODAL CONTROL ---------------- */

function hydratePayModal() {
  const cart = loadCart();
  const summaryWindowEl = document.getElementById("summaryWindow");
  const summaryItemsEl = document.getElementById("summaryItems");
  const summaryTotalEl = document.getElementById("summaryTotal");

  if (!summaryWindowEl || !summaryItemsEl || !summaryTotalEl) return;

  // Set pickup window text
  summaryWindowEl.textContent = pickupWindowSummary();

  // Create an HTML string with a line for each item
  const itemsHtml = cart.length
    ? cart.map(item => `
        <div class="summary-item">
          <span>${item.name}</span>
          <span>$${item.price.toFixed(2)}</span>
        </div>
      `).join("")
    : "<p>(Your cart is empty)</p>";
  
  // Use .innerHTML to render the new HTML
  summaryItemsEl.innerHTML = itemsHtml;

  // Set total text
  summaryTotalEl.textContent = "$" + calcTotal(cart).toFixed(2);
}

function openPayModal() {
  const cart = loadCart();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  hydratePayModal();

  const modal = document.getElementById("payModal");
  if (modal) modal.classList.remove("hidden");
}

function closePayModal() {
  const modal = document.getElementById("payModal");
  if (modal) modal.classList.add("hidden");
}

/* ---------------- CHECKOUT (STRIPE) ---------------- */

async function checkoutStripe() {
  const cart = loadCart();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const buyerName = document.getElementById("buyerName")?.value.trim() || "";
  const buyerPhone = document.getElementById("buyerPhone")?.value.trim() || "";
  const buyerEmail = document.getElementById("buyerEmail")?.value.trim() || "";

  if (!buyerName || !buyerPhone || !buyerEmail) {
    alert("Please fill name / phone / email.");
    return;
  }

  const payload = {
    items: cart.map(i => ({
      name: i.name,
      price: i.price
    })),
    pickupWindow: pickupWindowSummary(),
    name: buyerName,
    phone: buyerPhone,
    email: buyerEmail
  };

  try {
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert("Checkout unavailable.");
      return;
    }

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout error.");
    }
  } catch (err) {
    alert("Network error.");
  }
}

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});

document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="pickupWindow"]');
  const updateSelection = () => {
    document.querySelectorAll('.window-card').forEach(card => card.classList.remove('selected'));
    const checked = document.querySelector('input[name="pickupWindow"]:checked');
    if (checked) {
      const card = checked.closest('.window-card');
      if (card) card.classList.add('selected');
    }
  };

  radios.forEach(r => r.addEventListener('change', updateSelection));
  // also handle click on label (in case some inputs aren't fired)
  document.querySelectorAll('.window-card').forEach(card => {
    card.addEventListener('click', () => {
      const input = card.querySelector('input[name="pickupWindow"]');
      if (input && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  updateSelection();
});
