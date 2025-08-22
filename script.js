/* =========================
   ADS-ABN DIGITAL STORE
   Auth + Services + Checkout + History
   ========================= */

const STORE = {
  USERS: "ads_users_v1",          // { [email]: {name,email,password,history:[] } }
  LOGGED: "ads_logged_email_v1",  // string email
  SELECTED_SERVICE: "ads_selected_service_v1"
};

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);
const getUsers = () => JSON.parse(localStorage.getItem(STORE.USERS) || "{}");
const setUsers = u => localStorage.setItem(STORE.USERS, JSON.stringify(u));
const getLoggedEmail = () => localStorage.getItem(STORE.LOGGED);
const setLoggedEmail = e => localStorage.setItem(STORE.LOGGED, e);
const logout = () => { localStorage.removeItem(STORE.LOGGED); location.href = "login.html"; };

function ensureLoggedIfGuarded() {
  const guarded = document.body.classList.contains("guarded");
  if (guarded && !getLoggedEmail()) location.href = "login.html";
}

function encodeMsg(text) {
  // always use encodeURIComponent for wa.me
  return encodeURIComponent(text);
}

function formatLKR(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v + " LKR";
  return `LKR ${n.toLocaleString("en-LK")}`;
}

// ---------- Toggle password (eye) ----------
function bindPasswordToggles() {
  document.querySelectorAll("[data-toggle='password']").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.type = target.type === "password" ? "text" : "password";
      btn.classList.toggle("shown", target.type === "text");
    });
  });
}

// ---------- Register ----------
function bindRegister() {
  const form = byId("registerForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = byId("regName").value.trim();
    const email = byId("regEmail").value.trim().toLowerCase();
    const password = byId("regPass").value.trim();

    const users = getUsers();
    if (users[email]) {
      showAlert("register-alert", "Email already registered. Please login.", "warn");
      setTimeout(()=>location.href="login.html", 900);
      return;
    }
    users[email] = { name, email, password, history: [] };
    setUsers(users);
    showAlert("register-alert", "Registration successful. Please login.", "ok");
    setTimeout(()=>location.href="login.html", 900);
  });
}

// ---------- Login ----------
function bindLogin() {
  const form = byId("loginForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const email = byId("loginEmail").value.trim().toLowerCase();
    const password = byId("loginPass").value.trim();

    const users = getUsers();
    if (!users[email]) {
      showAlert("login-alert", "Email not found. Please register.", "warn");
      setTimeout(()=>location.href="register.html", 900);
      return;
    }
    if (users[email].password !== password) {
      showAlert("login-alert", "Wrong password.", "error");
      return;
    }
    setLoggedEmail(email);
    location.href = "index.html";
  });
}

// ---------- Services (store selected & go checkout) ----------
function bindServices() {
  document.querySelectorAll("[data-service]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.service;
      localStorage.setItem(STORE.SELECTED_SERVICE, name);
      location.href = "checkout.html";
    });
  });
}

// ---------- Checkout ----------
function bindCheckout() {
  const form = byId("checkoutForm");
  if (!form) return;

  // prefill email + service
  const emailInput = byId("email");
  const orderNameInput = byId("orderName");
  const logged = getLoggedEmail();
  if (logged) {
    emailInput.value = logged;
    emailInput.readOnly = true; // prevent mismatch
  }
  const pre = localStorage.getItem(STORE.SELECTED_SERVICE) || "";
  if (pre) orderNameInput.value = pre;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const users = getUsers();
    const loggedEmail = getLoggedEmail();
    if (!loggedEmail || !users[loggedEmail]) {
      showAlert("checkout-alert", "Please login first.", "warn");
      setTimeout(()=>location.href="login.html", 700);
      return;
    }

    // Collect
    const order = {
      customerName: byId("customerName").value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      password: byId("password").value.trim(),
      ffid: byId("ffid").value.trim(),
      orderName: orderNameInput.value.trim(),
      phone: byId("phone").value.trim(),
      amount: byId("amount").value.trim(),
      date: new Date().toLocaleString()
    };

    // email must match logged user (your rule)
    if (order.email !== loggedEmail) {
      showAlert("checkout-alert", "Email must match logged-in user!", "warn");
      return;
    }

    // Save history under logged email only
    users[loggedEmail].history = users[loggedEmail].history || [];
    users[loggedEmail].history.push(order);
    setUsers(users);

    // Bill text
    const bill =
`🧾 *ADS-ABN DIGITAL STORE — Order Bill*
-----------------------------------
👤 Name: ${order.customerName}
📧 Email: ${order.email}
🎮 FF ID / Username: ${order.ffid}
📦 Order: ${order.orderName}
📱 Phone: ${order.phone}
💰 Amount: ${formatLKR(order.amount)}
🕒 Date: ${order.date}
-----------------------------------
Thank you!`;

    // WhatsApp Click-to-Chat (works in browsers)
    const number = "94777990902";
    const wa = `https://wa.me/${number}?text=${encodeMsg(bill)}`;

    // Try open new tab; if blocked, fallback same tab
    const w = window.open(wa, "_blank");
    if (!w) location.href = wa;

    showAlert("checkout-alert", "Order saved & WhatsApp opened.", "ok");
    // optional redirect to history
    setTimeout(()=>location.href="history.html", 900);
  });
}

// ---------- History ----------
function loadHistory() {
  const wrap = byId("historyList");
  if (!wrap) return;
  const email = getLoggedEmail();
  const users = getUsers();
  if (!email || !users[email]) {
    wrap.innerHTML = "<p class='muted'>Please login to view history.</p>";
    return;
    }
  const list = users[email].history || [];
  if (list.length === 0) {
    wrap.innerHTML = "<p class='muted'>No orders yet.</p>";
    return;
  }
  wrap.innerHTML = "";
  list.slice().reverse().forEach(o => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="card-title">${o.orderName}</div>
      <div class="card-row"><span>Name</span><b>${o.customerName}</b></div>
      <div class="card-row"><span>FF ID / Username</span><b>${o.ffid}</b></div>
      <div class="card-row"><span>Phone</span><b>${o.phone}</b></div>
      <div class="card-row"><span>Amount</span><b>${formatLKR(o.amount)}</b></div>
      <div class="card-row"><span>Date</span><b>${o.date}</b></div>
    `;
    wrap.appendChild(div);
  });
}

// ---------- Neon Alerts ----------
function showAlert(containerId, message, type="ok") {
  const box = byId(containerId);
  if (!box) return alert(message);
  box.textContent = message;
  box.className = `alert ${type}`;
  box.style.display = "block";
  setTimeout(()=> box.style.display="none", 2500);
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  ensureLoggedIfGuarded();
  bindPasswordToggles();
  bindRegister();
  bindLogin();
  bindServices();
  bindCheckout();
  loadHistory();

  // global logout buttons
  document.querySelectorAll("[data-logout]").forEach(a=>{
    a.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  });
});