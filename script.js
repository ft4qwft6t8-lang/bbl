/* cart + checkout logic for ballard bread lab */

/* PUBLIC ENDPOINT for your Vercel backend API */
const CHECKOUT_ENDPOINT = "https://bbl-liart.vercel.app/api/create-checkout";

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

function addToCart(name, price) {
  const cart = loadCart();
  cart.push({ name, price });
  saveCart(cart);
  renderCart();
}

function removeFromCart(index) {
  const cart = loadCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function calcTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
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

function renderCart() {
  const cart = loadCart();
  const cartItemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");

  if (!cartItemsEl || !totalEl) return;

  if (!cart.length) {
    cartItemsEl.classList.add("empty-msg");
    cartItemsEl.innerHTML = "Cart is empty.";
    totalEl.textContent = "0.00";
    return;
  }

  cartItemsEl.classList.remove("empty-msg");

  const lines = cart.map((item, idx) => {
    return `
      <div class="cart-line">
        <div>
          <div class="cart-line-title">${item.name}</div>
          <div class="cart-line-sub">$${item.price.toFixed(2)}</div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${idx})">
          remove
        </button>
      </div>
    `;
  }).join("");

  cartItemsEl.innerHTML = lines;
  totalEl.textContent = calcTotal(cart).toFixed(2);
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
