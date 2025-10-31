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

// Cart state: canonical source is the persisted array in localStorage.

/**
 * Add one of an item to the cart.
 * Called from inline onclick attributes in index.html.
 */
function addToCart(name, price) {
  price = Number(price);
  try {
    const arr = loadCart() || [];
    arr.push({ name, price });
    saveCart(arr);
  } catch (e) {
    console.warn('addToCart persist failed', e);
  }
  renderCart();
  renderCartItems();
  updateCartTotal();
}

/**
 * Decrement one of an item (remove when qty reaches 0).
 */
function removeOneFromCart(name) {
  try {
    const arr = loadCart() || [];
    const idx = arr.findIndex(i => i.name === name);
    if (idx !== -1) {
      arr.splice(idx, 1);
      saveCart(arr);
    }
  } catch (e) {
    console.warn('removeOneFromCart persist failed', e);
  }
  renderCart();
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

  const stored = loadCart() || [];
  if (!stored.length) {
    container.classList.add('empty-msg');
    container.textContent = 'Cart is empty.';
    return;
  }

  container.classList.remove('empty-msg');

  // group by name
  const groups = stored.reduce((acc, item) => {
    if (!acc[item.name]) acc[item.name] = { price: item.price, qty: 0 };
    acc[item.name].qty += 1;
    return acc;
  }, {});

  Object.keys(groups).forEach(name => {
    const item = groups[name];
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
  const stored = loadCart() || [];
  const total = stored.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
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

/* ---------------- PERSISTENCE HELPERS ---------------- */

// Add one item to the persisted cart array in localStorage
function persistAddItem(name, price) {
  try {
    const arr = loadCart() || [];
    arr.push({ name, price: Number(price) });
    saveCart(arr);
  } catch (e) {
    // ignore storage failures
    console.warn('persistAddItem failed', e);
  }
}

// Remove one occurrence of an item by name from persisted array
function persistRemoveOne(name) {
  try {
    const arr = loadCart() || [];
    const idx = arr.findIndex(i => i.name === name);
    if (idx !== -1) {
      arr.splice(idx, 1);
      saveCart(arr);
    }
  } catch (e) {
    console.warn('persistRemoveOne failed', e);
  }
}

// Build the in-memory grouped `cart` object from the persisted array
function syncInMemoryFromStorage() {
  try {
    const arr = loadCart();
    // reset in-memory cart
    Object.keys(cart).forEach(k => delete cart[k]);
    if (!Array.isArray(arr)) return;
    arr.forEach(item => {
      const name = item.name;
      const price = Number(item.price) || 0;
      if (!cart[name]) cart[name] = { price, qty: 0 };
      cart[name].qty += 1;
    });
  } catch (e) {
    console.warn('syncInMemoryFromStorage failed', e);
  }
}

/* ---------------- MODAL CONTROL ---------------- */

function hydratePayModal() {
  const stored = loadCart();
  const summaryWindowEl = document.getElementById("summaryWindow");
  const summaryItemsEl = document.getElementById("summaryItems");
  const summaryTotalEl = document.getElementById("summaryTotal");

  if (!summaryWindowEl || !summaryItemsEl || !summaryTotalEl) return;

  // Set pickup window text
  summaryWindowEl.textContent = pickupWindowSummary();

  // Prefer the persisted cart (array). If none, fall back to the in-memory grouped `cart` object.
  let itemsArr = Array.isArray(stored) && stored.length ? stored : [];
  if (!itemsArr.length) {
    // build an array from the in-memory grouped cart object
    Object.keys(cart).forEach(name => {
      const it = cart[name];
      for (let i = 0; i < (it.qty || 0); i++) {
        itemsArr.push({ name, price: Number(it.price) });
      }
    });
  }

  // Create an HTML string with a line for each item
  const itemsHtml = itemsArr.length
    ? itemsArr.map(item => `
        <div class="summary-item">
          <span>${item.name}</span>
          <span>$${Number(item.price).toFixed(2)}</span>
        </div>
      `).join("")
    : "<p>(Your cart is empty)</p>";

  // Use .innerHTML to render the new HTML
  summaryItemsEl.innerHTML = itemsHtml;

  // Set total text
  summaryTotalEl.textContent = "$" + calcTotal(itemsArr).toFixed(2);
}

// calculate total for an array of items [{name, price}, ...]
function calcTotal(itemsArray) {
  if (!Array.isArray(itemsArray)) return 0;
  return itemsArray.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
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
  // sync persisted array into the in-memory grouped cart, then render
  syncInMemoryFromStorage();
  renderCart();
  renderCartItems();
  updateCartTotal();
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
