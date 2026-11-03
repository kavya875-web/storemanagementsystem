/* =====================================================================
   KHATA: 1) Supplier Pending Bills (humein dena hai)
          2) Customer Udhari (humein lena hai - Grouped by Customer)
   Uses globals from app.js: supplierBills, udhariEntries, customers,
   invoices, restockHistory, settings, saveData, openModal, closeModal,
   showToast, escapeHtml, switchTab
   ===================================================================== */

const khataMoney = n => `${settings.currency || "₹"}${Number(n || 0).toFixed(2)}`;
const khataToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const khataDate = s => (s ? new Date(s + (s.length === 10 ? "T00:00:00" : "")).toLocaleDateString([], { dateStyle: "medium" }) : "-");
const khataBalance = e => Math.max(0, Number(e.amount) - (e.payments || []).reduce((t, p) => t + Number(p.amount), 0));
const khataPaid = e => (e.payments || []).reduce((t, p) => t + Number(p.amount), 0);

// View State
let udhariViewMode = "grouped"; // "grouped" = Customer-wise section, "all" = All individual bills
const expandedCustomerKeys = new Set();
let activeLedgerCustomerKey = null;

function renderKhata() {
  renderSupplierBills();
  renderUdhari();
}

/* ---------------- SUPPLIER PENDING BILLS ---------------- */
function renderSupplierBills() {
  const tbody = document.getElementById("sb-table-body");
  if (!tbody) return;
  const search = document.getElementById("sb-search").value.toLowerCase().trim();
  const filter = document.getElementById("sb-filter").value;
  const today = khataToday();

  // summary (always over all bills)
  let total = 0, count = 0, overdue = 0;
  supplierBills.forEach(b => {
    const bal = khataBalance(b);
    if (bal > 0) {
      total += bal; count++;
      if (b.dueDate && b.dueDate < today) overdue += bal;
    }
  });
  document.getElementById("sb-total").textContent = khataMoney(total);
  document.getElementById("sb-count").textContent = count;
  document.getElementById("sb-overdue").textContent = khataMoney(overdue);
  const badge = document.getElementById("tab-badge-bills");
  if (badge) {
    badge.style.display = count ? "inline-flex" : "none";
    badge.textContent = count;
  }

  const list = supplierBills
    .filter(b => {
      const bal = khataBalance(b);
      if (filter === "pending" && bal <= 0) return false;
      if (filter === "paid" && bal > 0) return false;
      return !search || b.supplier.toLowerCase().includes(search) || (b.billNo || "").toLowerCase().includes(search);
    })
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  tbody.innerHTML = "";
  document.getElementById("sb-empty").style.display = list.length ? "none" : "block";

  list.forEach(b => {
    const bal = khataBalance(b);
    const isOver = bal > 0 && b.dueDate && b.dueDate < today;
    const status = bal <= 0
      ? '<span class="badge badge-success">Paid</span>'
      : isOver ? '<span class="badge badge-danger">Date nikal gayi</span>'
      : paidAny(b) ? '<span class="badge badge-warning">Aadha diya</span>'
      : '<span class="badge badge-warning">Pending</span>';
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div style="font-weight:600;color:#0f172a;">${escapeHtml(b.supplier)}</div></td>
      <td>${escapeHtml(b.billNo || "-")}</td>
      <td>${khataDate(b.billDate)}</td>
      <td style="${isOver ? "color:#b91c1c;font-weight:600;" : ""}">${khataDate(b.dueDate)}</td>
      <td>${khataMoney(b.amount)}</td>
      <td style="color:#166534;">${khataMoney(khataPaid(b))}</td>
      <td><strong style="color:${bal > 0 ? "#b91c1c" : "#166534"};">${khataMoney(bal)}</strong></td>
      <td>${status}</td>
      <td style="text-align:right;">
        <div class="actions-cell" style="justify-content:flex-end;">
          ${bal > 0 ? `<button class="btn btn-sm btn-success" onclick="openKhataPay('bill','${b.id}')">💵 Pay</button>` : `<button class="btn btn-sm btn-outline" onclick="openKhataPay('bill','${b.id}')">History</button>`}
          <button class="btn btn-sm btn-danger" onclick="deleteKhata('bill','${b.id}')" title="Delete" style="padding:5px 8px;">&times;</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  // supplier suggestions (from restock log + earlier bills)
  const names = new Set();
  restockHistory.forEach(r => r.supplier && r.supplier !== "Initial Setup" && names.add(r.supplier));
  supplierBills.forEach(b => names.add(b.supplier));
  const sDataList = document.getElementById("supplier-datalist");
  if (sDataList) {
    sDataList.innerHTML = [...names].map(n => `<option value="${escapeHtml(n)}">`).join("");
  }
}
function paidAny(e) { return khataPaid(e) > 0; }

/* ---------------- CUSTOMER GROUPING LOGIC ---------------- */
function normalizeCustomerPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeCustomerName(name) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildCustomerAliasMap(entries) {
  const phoneToKey = new Map();
  const nameToKey = new Map();

  // 1. Registered store customers
  if (typeof customers !== "undefined" && Array.isArray(customers)) {
    customers.forEach(c => {
      const normP = normalizeCustomerPhone(c.phone);
      const normN = normalizeCustomerName(c.name);
      if (normP && normP.length >= 10) {
        const canonicalKey = "phone_" + normP;
        phoneToKey.set(normP, canonicalKey);
        if (normN && normN !== "walk-in customer" && normN !== "customer") {
          nameToKey.set(normN, canonicalKey);
        }
      }
    });
  }

  // 2. Scan udhari entries with phone
  entries.forEach(u => {
    const normP = normalizeCustomerPhone(u.phone);
    const normN = normalizeCustomerName(u.name);
    if (normP && normP.length >= 10) {
      let canonicalKey = phoneToKey.get(normP);
      if (!canonicalKey) {
        canonicalKey = "phone_" + normP;
        phoneToKey.set(normP, canonicalKey);
      }
      if (normN && normN !== "walk-in customer" && normN !== "customer") {
        if (!nameToKey.has(normN)) {
          nameToKey.set(normN, canonicalKey);
        }
      }
    }
  });

  return { phoneToKey, nameToKey };
}

function getCustomerGroupKey(u, aliasMap) {
  const normP = normalizeCustomerPhone(u.phone);
  const normN = normalizeCustomerName(u.name);

  // Match by 10-digit phone
  if (normP && normP.length >= 10 && aliasMap?.phoneToKey?.has(normP)) {
    return aliasMap.phoneToKey.get(normP);
  }

  // Match by customer name if alias exists
  if (normN && aliasMap?.nameToKey?.has(normN)) {
    return aliasMap.nameToKey.get(normN);
  }

  // Fallback to phone if exists
  if (normP && normP.length >= 4) {
    return "phone_" + normP;
  }

  // Fallback to clean name
  if (normN && normN !== "walk-in customer" && normN !== "customer") {
    return "name_" + normN;
  }

  return "entry_" + (u.id || Math.random().toString(36).substr(2, 6));
}

function groupUdhariByCustomer(entries) {
  const aliasMap = buildCustomerAliasMap(entries);
  const groupsMap = new Map();

  entries.forEach(u => {
    const key = getCustomerGroupKey(u, aliasMap);
    const normP = normalizeCustomerPhone(u.phone);

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key: key,
        name: u.name || "Customer",
        phone: normP || (u.phone ? String(u.phone).replace(/\D/g, "") : ""),
        bills: [],
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        lastDate: u.date || ""
      });
    }

    const g = groupsMap.get(key);
    // Prefer more complete name over generic placeholder
    if (u.name && u.name !== "Walk-in Customer" && (!g.name || g.name === "Customer" || g.name.startsWith("Customer "))) {
      g.name = u.name;
    }
    if (normP && (!g.phone || g.phone.length < 10)) {
      g.phone = normP;
    }

    g.bills.push(u);
    const bal = khataBalance(u);
    const paid = khataPaid(u);
    g.totalAmount += Number(u.amount || 0);
    g.totalPaid += paid;
    g.totalDue += bal;
    if (!g.lastDate || (u.date && u.date > g.lastDate)) {
      g.lastDate = u.date;
    }
  });

  // Sort bills inside each customer group: newest first
  groupsMap.forEach(g => {
    g.bills.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.id || "").localeCompare(a.id || ""));
    g.pendingBills = g.bills.filter(b => khataBalance(b) > 0);
  });

  // Sort customer groups: pending dues first, then by latest bill date
  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.totalDue > 0 && b.totalDue <= 0) return -1;
    if (a.totalDue <= 0 && b.totalDue > 0) return 1;
    return (b.lastDate || "").localeCompare(a.lastDate || "");
  });
}

/* ---------------- CUSTOMER UDHARI RENDER ---------------- */
function renderUdhari() {
  const sectionsContainer = document.getElementById("ud-customer-sections");
  const tableCard = document.getElementById("ud-table-card");
  const tbody = document.getElementById("ud-table-body");
  const thead = document.getElementById("ud-table-thead");
  const emptyElem = document.getElementById("ud-empty");

  const searchInput = document.getElementById("ud-search");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const filterElem = document.getElementById("ud-filter");
  const filter = filterElem ? filterElem.value : "pending";

  // Summary counters (over ALL entries)
  const aliasMap = buildCustomerAliasMap(udhariEntries);
  let total = 0, received = 0;
  const owing = new Set();
  udhariEntries.forEach(u => {
    const bal = khataBalance(u);
    received += khataPaid(u);
    if (bal > 0) {
      total += bal;
      owing.add(getCustomerGroupKey(u, aliasMap));
    }
  });

  const udTotalElem = document.getElementById("ud-total");
  if (udTotalElem) udTotalElem.textContent = khataMoney(total);
  const udCountElem = document.getElementById("ud-count");
  if (udCountElem) udCountElem.textContent = owing.size;
  const udRecElem = document.getElementById("ud-received");
  if (udRecElem) udRecElem.textContent = khataMoney(received);
  const badge = document.getElementById("tab-badge-udhari");
  if (badge) {
    badge.style.display = owing.size ? "inline-flex" : "none";
    badge.textContent = owing.size;
  }

  // RENDER BASED ON VIEW MODE
  if (udhariViewMode === "grouped") {
    // 1. DEDICATED CUSTOMER KHATA SECTIONS (Default)
    if (sectionsContainer) sectionsContainer.style.display = "flex";
    if (tableCard) tableCard.style.display = "none";
    if (sectionsContainer) sectionsContainer.innerHTML = "";

    const allGroups = groupUdhariByCustomer(udhariEntries);

    const filteredGroups = allGroups.filter(g => {
      if (filter === "pending" && g.totalDue <= 0) return false;
      if (filter === "paid" && g.totalDue > 0) return false;
      if (!search) return true;
      const matchesName = g.name.toLowerCase().includes(search);
      const matchesPhone = (g.phone || "").includes(search);
      const matchesBill = g.bills.some(b => 
        (b.note || "").toLowerCase().includes(search) || 
        (b.invoiceNumber || "").toLowerCase().includes(search)
      );
      return matchesName || matchesPhone || matchesBill;
    });

    if (emptyElem) {
      emptyElem.style.display = filteredGroups.length ? "none" : "block";
    }

    if (!sectionsContainer) return;

    filteredGroups.forEach(g => {
      const card = document.createElement("div");
      card.className = `customer-khata-card ${g.totalDue > 0 ? "has-due" : "is-clear"}`;
      card.id = `cust-section-${g.key}`;

      // Build rows for all bills of this customer
      let billsRowsHtml = "";
      g.bills.forEach((b, idx) => {
        const bal = khataBalance(b);
        const paid = khataPaid(b);
        const isPaid = bal <= 0;
        billsRowsHtml += `
          <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
            <td>
              ${b.invoiceNumber ? `
                <button type="button" class="btn btn-sm btn-outline" onclick="viewBillFromUdhari('${b.invoiceNumber || b.invoiceId}')" title="Original Bill Slip Dekhein" style="padding:2px 7px;font-size:0.75rem;font-weight:700;color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe;">
                  🧾 ${escapeHtml(b.invoiceNumber)}
                </button>
              ` : `<span style="color:#64748b; font-size:0.78rem; font-weight:600;">Entry #${idx + 1}</span>`}
            </td>
            <td style="color:#475569; font-size:0.8rem; white-space:nowrap;">
              ${khataDate(b.date)}
              ${b.dueDate ? `<div style="font-size:0.72rem; color:#b45309; font-weight:600;">Due: ${khataDate(b.dueDate)}</div>` : ""}
            </td>
            <td>
              <div style="font-size:0.85rem; color:#1e293b; line-height:1.35; font-weight:500;">
                ${escapeHtml(b.note || "-")}
              </div>
            </td>
            <td style="text-align:right; font-weight:600; color:#334155;">
              ${khataMoney(b.amount)}
            </td>
            <td style="text-align:right; color:#166534; font-weight:600;">
              ${khataMoney(paid)}
            </td>
            <td style="text-align:right;">
              <strong style="color:${bal > 0 ? "#b91c1c" : "#166534"}; font-size:0.95rem;">${khataMoney(bal)}</strong>
            </td>
            <td style="text-align:center;">
              ${isPaid ? '<span class="badge badge-success" style="font-size:0.72rem;">Clear</span>' : '<span class="badge badge-warning" style="font-size:0.72rem;">Pending</span>'}
            </td>
            <td style="text-align:right; white-space:nowrap;">
              <div class="actions-cell" style="justify-content:flex-end;">
                ${bal > 0 ? `
                  <button class="btn btn-sm btn-success" onclick="openKhataPay('udhari','${b.id}')" title="Is bill ke paise jama karein" style="padding:4px 9px;font-size:0.75rem;font-weight:600;">
                    💵 Jama
                  </button>
                ` : `
                  <button class="btn btn-sm btn-outline" onclick="openKhataPay('udhari','${b.id}')" title="Payment history" style="padding:4px 8px;font-size:0.75rem;">
                    History
                  </button>
                `}
                ${b.invoiceNumber || b.invoiceId ? `
                  <button class="btn btn-sm btn-outline" onclick="viewBillFromUdhari('${b.invoiceNumber || b.invoiceId}')" title="Original Bill Slip Print/Dekhein" style="padding:4px 8px;font-size:0.75rem;">
                    🧾 Slip
                  </button>
                ` : ""}
                <button class="btn btn-sm btn-danger" onclick="deleteKhata('udhari','${b.id}')" title="Delete bill" style="padding:4px 7px;font-size:0.75rem;">&times;</button>
              </div>
            </td>
          </tr>
        `;
      });

      card.innerHTML = `
        <!-- CUSTOMER SECTION HEADER -->
        <div class="customer-khata-card-header">
          <div class="cust-info">
            <div class="cust-avatar">👤</div>
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <h4 class="cust-name">${escapeHtml(g.name)}</h4>
                ${g.totalDue <= 0 ? '<span class="badge badge-success" style="font-size:0.72rem;">Sabhi Bills Clear ✅</span>' : ""}
              </div>
              <div class="cust-meta">
                ${g.phone ? `<span style="font-family:monospace; color:#1e40af; font-weight:700;">📞 +91 ${escapeHtml(g.phone)}</span>` : '<span style="color:#94a3b8;">No phone</span>'}
                <span class="badge ${g.pendingBills.length > 0 ? "badge-warning" : "badge-success"}" style="font-weight:700;">
                  📂 ${g.pendingBills.length} Pending / ${g.bills.length} Kul Bills
                </span>
                ${g.bills.length > 1 ? `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:700; border:1px solid #c7d2fe;">⚡ Ek Hi Section Me ${g.bills.length} Bills</span>` : ""}
              </div>
            </div>
          </div>

          <div class="cust-stats-group">
            <div class="cust-stat">
              <small>Kul Udhari</small>
              <b>${khataMoney(g.totalAmount)}</b>
            </div>
            <div class="cust-stat">
              <small>Jama Mila</small>
              <b style="color:#16a34a;">${khataMoney(g.totalPaid)}</b>
            </div>
            <div class="cust-stat primary">
              <small>KUL BAAKI</small>
              <b style="color:${g.totalDue > 0 ? "#b91c1c" : "#16a34a"};">${khataMoney(g.totalDue)}</b>
            </div>
            <div class="cust-actions">
              ${g.totalDue > 0 ? `
                <button class="btn btn-sm btn-success" onclick="openKhataCustomerPay('${g.key}')" title="Customer ki baaki udhari jama karein" style="font-weight:700;">
                  💵 Jama Karein
                </button>
              ` : ""}
              ${g.phone ? `
                <button class="btn btn-sm btn-whatsapp" onclick="sendCustomerAllBillsWhatsApp('${g.key}')" title="Customer ke WhatsApp par sabhi ${g.bills.length} bills ka hisaab bhejein">
                  📲 WhatsApp
                </button>
              ` : ""}
              <button class="btn btn-sm btn-outline" onclick="openCustomerLedgerModal('${g.key}')" title="Customer ka poora statement dekhein">
                👁️ Statement
              </button>
            </div>
          </div>
        </div>

        <!-- CUSTOMER BILLS INSIDE THIS SINGLE SECTION -->
        <div class="customer-khata-card-body">
          <div class="customer-bills-subhead">
            <span><strong>📋 Is Customer ke Sabhi Bills (${g.bills.length}):</strong> Sare bills isi ek section me darj hain</span>
            <span style="font-size:0.75rem; color:#64748b;">Aakhri bill: ${khataDate(g.lastDate)}</span>
          </div>

          <div class="table-responsive">
            <table class="sub-bills-table">
              <thead>
                <tr>
                  <th style="width:115px;">Bill / Invoice #</th>
                  <th style="width:110px;">Date</th>
                  <th>Saaman / Items Description</th>
                  <th style="text-align:right; width:110px;">Bill Amount</th>
                  <th style="text-align:right; width:100px;">Jama Mila</th>
                  <th style="text-align:right; width:110px;">Baaki (Due)</th>
                  <th style="text-align:center; width:85px;">Status</th>
                  <th style="text-align:right; width:160px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${billsRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;

      sectionsContainer.appendChild(card);
    });

  } else {
    // 2. FLAT ALL BILLS LIST VIEW (When '📋 Sabhi Bills' is active)
    if (sectionsContainer) sectionsContainer.style.display = "none";
    if (tableCard) tableCard.style.display = "block";
    if (tbody) tbody.innerHTML = "";

    const list = udhariEntries
      .filter(u => {
        const bal = khataBalance(u);
        if (filter === "pending" && bal <= 0) return false;
        if (filter === "paid" && bal > 0) return false;
        return !search || u.name.toLowerCase().includes(search) || (u.phone || "").includes(search) || (u.note || "").toLowerCase().includes(search) || (u.invoiceNumber || "").toLowerCase().includes(search);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    if (emptyElem) emptyElem.style.display = list.length ? "none" : "block";

    if (!tbody) return;

    list.forEach(u => {
      const bal = khataBalance(u);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="font-weight:600;color:#0f172a;">${escapeHtml(u.name)}</div>
          ${bal <= 0 ? '<span class="badge badge-success" style="font-size:0.72rem;">Clear</span>' : ""}
        </td>
        <td>${u.phone ? `<span style="font-family:monospace;color:#1e40af;font-weight:600;">+91 ${escapeHtml(u.phone)}</span>` : "-"}</td>
        <td>
          ${u.invoiceNumber ? `<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:0.75rem;font-weight:700;">🧾 ${escapeHtml(u.invoiceNumber)}</span>` : `<span style="color:#64748b;">-</span>`}
        </td>
        <td>${khataDate(u.date)}</td>
        <td>
          <span style="font-size:0.85rem;color:#475569;">${escapeHtml(u.note || "-")}</span>
          ${u.dueDate ? `<div style="font-size:0.72rem;color:#b45309;font-weight:600;margin-top:2px;">Due: ${khataDate(u.dueDate)}</div>` : ""}
        </td>
        <td style="font-weight:600;">${khataMoney(u.amount)}</td>
        <td style="color:#166534;font-weight:600;">${khataMoney(khataPaid(u))}</td>
        <td><strong style="color:${bal > 0 ? "#b91c1c" : "#166534"};font-size:0.95rem;">${khataMoney(bal)}</strong></td>
        <td style="text-align:center;">
          ${bal <= 0 ? '<span class="badge badge-success" style="font-size:0.72rem;">Clear</span>' : '<span class="badge badge-warning" style="font-size:0.72rem;">Pending</span>'}
        </td>
        <td style="text-align:right;">
          <div class="actions-cell" style="justify-content:flex-end;">
            ${bal > 0 ? `<button class="btn btn-sm btn-success" onclick="openKhataPay('udhari','${u.id}')">💵 Jama</button>` : `<button class="btn btn-sm btn-outline" onclick="openKhataPay('udhari','${u.id}')">History</button>`}
            ${u.invoiceNumber || u.invoiceId ? `<button class="btn btn-sm btn-outline" onclick="viewBillFromUdhari('${u.invoiceNumber || u.invoiceId}')" title="Original Bill Slip Dekhein">🧾 Slip</button>` : ""}
            ${bal > 0 && u.phone ? `<button class="btn btn-sm btn-whatsapp" onclick="remindUdhari('${u.id}')" title="WhatsApp reminder">📲</button>` : ""}
            <button class="btn btn-sm btn-danger" onclick="deleteKhata('udhari','${u.id}')" title="Delete" style="padding:5px 8px;">&times;</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

/* ---------------- ACCORDION TOGGLE ---------------- */
function toggleCustomerAccordion(key, event) {
  if (event && event.target && (event.target.tagName === "BUTTON" || event.target.closest("button") || event.target.tagName === "A")) {
    return;
  }
  const accordionRow = document.getElementById(`accordion-${key}`);
  const arrow = document.getElementById(`arrow-${key}`);
  if (!accordionRow) return;

  if (expandedCustomerKeys.has(key)) {
    expandedCustomerKeys.delete(key);
    accordionRow.style.display = "none";
    if (arrow) arrow.textContent = "▶";
    accordionRow.previousElementSibling?.classList.remove("expanded");
  } else {
    expandedCustomerKeys.add(key);
    accordionRow.style.display = "table-row";
    if (arrow) arrow.textContent = "▼";
    accordionRow.previousElementSibling?.classList.add("expanded");
  }
}

/* ---------------- CUSTOMER FULL LEDGER STATEMENT MODAL ---------------- */
function openCustomerLedgerModal(custKey) {
  activeLedgerCustomerKey = custKey;
  const groups = groupUdhariByCustomer(udhariEntries);
  const g = groups.find(x => x.key === custKey);
  if (!g) {
    showToast("Customer records nahi mile", "warning");
    return;
  }

  const nameElem = document.getElementById("cld-customer-name");
  if (nameElem) nameElem.textContent = `${g.name} - Khata Statement`;
  const subElem = document.getElementById("cld-customer-sub");
  if (subElem) subElem.textContent = g.phone ? `Mobile: +91 ${g.phone} · Kul ${g.bills.length} bills (${g.pendingBills.length} pending)` : `Kul ${g.bills.length} bills`;

  document.getElementById("cld-total-amt").textContent = khataMoney(g.totalAmount);
  document.getElementById("cld-total-paid").textContent = khataMoney(g.totalPaid);
  document.getElementById("cld-total-due").textContent = khataMoney(g.totalDue);
  document.getElementById("cld-bills-count").textContent = `${g.bills.length} Bills (${g.pendingBills.length} Pending)`;

  const tbody = document.getElementById("cld-bills-tbody");
  tbody.innerHTML = "";

  g.bills.forEach((b, idx) => {
    const bal = khataBalance(b);
    const paid = khataPaid(b);
    const isPaid = bal <= 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${b.invoiceNumber ? `<strong style="color:#1d4ed8;">🧾 ${escapeHtml(b.invoiceNumber)}</strong>` : `<span>Entry #${idx + 1}</span>`}<br>
        <span style="font-size:0.75rem; color:#64748b;">${khataDate(b.date)}</span>
      </td>
      <td>
        <div style="font-size:0.85rem; color:#334155;">${escapeHtml(b.note || "-")}</div>
        ${b.dueDate ? `<div style="font-size:0.72rem; color:#b45309; font-weight:600;">Due: ${khataDate(b.dueDate)}</div>` : ""}
      </td>
      <td style="font-weight:600;">${khataMoney(b.amount)}</td>
      <td style="color:#166534; font-weight:600;">${khataMoney(paid)}</td>
      <td><strong style="color:${bal > 0 ? "#b91c1c" : "#166534"};">${khataMoney(bal)}</strong></td>
      <td>
        ${isPaid ? '<span class="badge badge-success" style="font-size:0.7rem;">Clear</span>' : '<span class="badge badge-warning" style="font-size:0.7rem;">Pending</span>'}
      </td>
      <td style="text-align:right;">
        <div class="actions-cell" style="justify-content:flex-end;">
          ${bal > 0 ? `<button class="btn btn-sm btn-success" onclick="openKhataPay('udhari','${b.id}')">💵 Jama</button>` : ""}
          ${b.invoiceNumber || b.invoiceId ? `<button class="btn btn-sm btn-outline" onclick="viewBillFromUdhari('${b.invoiceNumber || b.invoiceId}')">🧾 Slip</button>` : ""}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire buttons in modal
  const btnWhatsapp = document.getElementById("btn-cld-whatsapp");
  if (btnWhatsapp) {
    btnWhatsapp.onclick = () => sendCustomerAllBillsWhatsApp(custKey);
  }
  const btnPrint = document.getElementById("btn-cld-print");
  if (btnPrint) {
    btnPrint.onclick = () => printCustomerStatement(custKey);
  }
  const btnPayAll = document.getElementById("btn-cld-pay-all");
  if (btnPayAll) {
    btnPayAll.style.display = g.totalDue > 0 ? "inline-flex" : "none";
    btnPayAll.onclick = () => {
      closeModal("modal-customer-ledger");
      openKhataCustomerPay(custKey);
    };
  }

  openModal("modal-customer-ledger");
}

/* ---------------- SEND ALL BILLS ON WHATSAPP ---------------- */
function sendCustomerAllBillsWhatsApp(custKey) {
  const groups = groupUdhariByCustomer(udhariEntries);
  const g = groups.find(x => x.key === custKey);
  if (!g) return;

  let phone = g.phone;
  if (!phone) {
    phone = prompt(`Customer "${g.name}" ka 10-digit mobile number daalein:`);
    if (!phone) return;
    g.phone = phone.replace(/\D/g, "");
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

  let text = `Namaste *${g.name}* ji,\n`;
  text += `*${settings.storeName.toUpperCase()}* se aapka Udhari Khata Hisab:\n`;
  text += `--------------------------------\n`;

  if (g.pendingBills.length === 0) {
    text += `✅ Aapke sabhi purane bills clear hain! Koi baaki nahi hai.\n`;
  } else {
    text += `*PENDING BILLS KI LIST (${g.pendingBills.length}):*\n`;
    g.pendingBills.forEach((b, idx) => {
      const bal = khataBalance(b);
      const billLabel = b.invoiceNumber ? `Bill #${b.invoiceNumber}` : `Khata Entry #${idx + 1}`;
      text += `${idx + 1}. *${billLabel}* (${khataDate(b.date)})\n`;
      if (b.note) {
        text += `   📝 ${b.note}\n`;
      }
      text += `   Total: ${khataMoney(b.amount)} | *Baaki: ${khataMoney(bal)}*\n`;
    });
  }

  text += `--------------------------------\n`;
  text += `Kul Udhari: ${khataMoney(g.totalAmount)}\n`;
  text += `Ab Tak Jama: ${khataMoney(g.totalPaid)}\n`;
  text += `*KUL BAAKI RAKAM (NET DUE): ${khataMoney(g.totalDue)}*\n`;
  text += `--------------------------------\n`;
  if (g.totalDue > 0) {
    text += `🙏 Kripya baaki rakam samay par jama kar dein.\n`;
  } else {
    text += `Aapka hisab bilkul clear hai. Dhanyawad! 😊\n`;
  }
  if (settings.storePhone) {
    text += `Sampark / GPay: +91 ${settings.storePhone}\n`;
  }

  window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  showToast(`WhatsApp hisab bheja ja raha hai...`, "success");
}

/* ---------------- PRINT CUSTOMER STATEMENT ---------------- */
function printCustomerStatement(custKey) {
  window.print();
}

/* ---------------- PAY FULL/PARTIAL TOWARDS CUSTOMER TOTAL BALANCE ---------------- */
function openKhataCustomerPay(custKey) {
  const groups = groupUdhariByCustomer(udhariEntries);
  const g = groups.find(x => x.key === custKey);
  if (!g) return;

  const totalDue = g.totalDue;
  if (totalDue <= 0) {
    showToast("Is customer ka koi baaki hisab nahi hai", "info");
    return;
  }

  document.getElementById("kp-type").value = "customer_udhari";
  document.getElementById("kp-id").value = custKey;
  document.getElementById("kp-title").textContent = `Customer Jama: ${g.name}`;
  document.getElementById("kp-sub").textContent = `Kul Baaki: ${khataMoney(totalDue)} (${g.pendingBills.length} pending bills)`;
  document.getElementById("kp-date").value = khataToday();

  const amt = document.getElementById("kp-amount");
  amt.value = totalDue;
  amt.max = totalDue;
  amt.disabled = false;

  document.getElementById("kp-hint").textContent = `Customer se jitne paise mile wo daalein (Purane bills pehle clear honge)`;
  document.getElementById("kp-submit").style.display = "";
  document.getElementById("kp-submit").textContent = "Jama Rakam Save Karo";

  const hist = g.bills.map(b => {
    const bal = khataBalance(b);
    return `<div><span>${khataDate(b.date)} · ${b.invoiceNumber || "Bill"}</span><strong>Baaki: ${khataMoney(bal)}</strong></div>`;
  }).join("");
  document.getElementById("kp-history").innerHTML = `<b>Customer ke Pending Bills:</b>${hist}`;

  openModal("modal-khata-pay");
}

/* ---------------- REMIND SINGLE UDHARI ---------------- */
function remindUdhari(id) {
  const u = udhariEntries.find(x => x.id === id);
  if (!u || !u.phone) return;
  const due = udhariEntries.filter(x => x.phone === u.phone).reduce((t, x) => t + khataBalance(x), 0);
  const billInfo = u.invoiceNumber ? ` (Bill: ${u.invoiceNumber})` : "";
  const msg = `Namaste ${u.name} ji,\n*${settings.storeName}* se yaad dilana tha ki aapki *${khataMoney(due)}* ki udhari baaki hai${billInfo}. Kripya jaldi jama kar dein.\n${settings.storePhone ? "Sampark: +91 " + settings.storePhone + "\n" : ""}Dhanyawad 🙏`;
  window.open(`https://api.whatsapp.com/send?phone=91${u.phone}&text=${encodeURIComponent(msg)}`, "_blank");
}

/* ---------------- PAYMENT MODAL (SINGLE BILL / SUPPLIER) ---------------- */
function openKhataPay(type, id) {
  const list = type === "bill" ? supplierBills : udhariEntries;
  const e = list.find(x => x.id === id);
  if (!e) return;
  const bal = khataBalance(e);
  const who = type === "bill" ? e.supplier : e.name;
  document.getElementById("kp-type").value = type;
  document.getElementById("kp-id").value = id;
  document.getElementById("kp-title").textContent = type === "bill" ? "Supplier ko Payment" : "Customer se Jama";
  document.getElementById("kp-sub").textContent = `${who} · Baaki ${khataMoney(bal)}`;
  document.getElementById("kp-date").value = khataToday();
  const amt = document.getElementById("kp-amount");
  amt.value = bal > 0 ? bal : "";
  amt.max = bal;
  amt.disabled = bal <= 0;
  document.getElementById("kp-hint").textContent = bal > 0 ? `Poora clear karne ke liye ${khataMoney(bal)} daalein` : "Ye entry clear ho chuki hai";
  document.getElementById("kp-submit").style.display = bal > 0 ? "" : "none";
  document.getElementById("kp-submit").textContent = type === "bill" ? "Payment Save Karo" : "Jama Save Karo";
  const hist = (e.payments || []).map(p => `<div><span>${khataDate(p.date)} · ${escapeHtml(p.mode || "")}</span><strong>${khataMoney(p.amount)}</strong></div>`).join("");
  document.getElementById("kp-history").innerHTML = hist ? `<b>Ab tak ki payments:</b>${hist}` : "";
  openModal("modal-khata-pay");
}

function deleteKhata(type, id) {
  const list = type === "bill" ? supplierBills : udhariEntries;
  const e = list.find(x => x.id === id);
  if (!e) return;
  const who = type === "bill" ? e.supplier : e.name;
  if (!confirm(`"${who}" ki ye entry hata dein? Iski payment history bhi hat jayegi.`)) return;
  if (type === "bill") supplierBills = supplierBills.filter(x => x.id !== id);
  else udhariEntries = udhariEntries.filter(x => x.id !== id);
  saveData();
  renderKhata();
  showToast("Entry hata di gayi", "warning");
}

/* ---------------- EVENT WIRING ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  $("btn-open-add-sbill")?.addEventListener("click", () => {
    $("form-add-sbill").reset();
    $("sb-date").value = khataToday();
    openModal("modal-add-sbill");
  });
  $("btn-open-add-udhari")?.addEventListener("click", () => {
    $("form-add-udhari").reset();
    $("ud-date").value = khataToday();
    openModal("modal-add-udhari");
  });

  ["sb-search", "sb-filter"].forEach(id => $(id)?.addEventListener("input", renderSupplierBills));
  ["ud-search", "ud-filter"].forEach(id => $(id)?.addEventListener("input", renderUdhari));

  // View switch: Customer Khata (Grouped) vs All Bills List
  const btnGrouped = $("btn-ud-view-grouped");
  const btnAll = $("btn-ud-view-all");
  if (btnGrouped && btnAll) {
    btnGrouped.addEventListener("click", () => {
      udhariViewMode = "grouped";
      btnGrouped.classList.add("active");
      btnAll.classList.remove("active");
      renderUdhari();
    });
    btnAll.addEventListener("click", () => {
      udhariViewMode = "all";
      btnAll.classList.add("active");
      btnGrouped.classList.remove("active");
      renderUdhari();
    });
  }

  // auto-fill customer name from registered mobile
  $("ud-phone")?.addEventListener("input", () => {
    const ph = $("ud-phone").value.replace(/\D/g, "");
    if (ph.length === 10) {
      const c = customers.find(x => x.phone === ph);
      if (c && !$("ud-name").value) $("ud-name").value = c.name;
    }
  });

  $("form-add-sbill")?.addEventListener("submit", ev => {
    ev.preventDefault();
    supplierBills.push({
      id: "sb-" + Date.now(),
      supplier: $("sb-name").value.trim(),
      billNo: $("sb-billno").value.trim(),
      amount: parseFloat($("sb-amount").value),
      billDate: $("sb-date").value,
      dueDate: $("sb-due").value,
      payments: []
    });
    saveData(); renderKhata();
    closeModal("modal-add-sbill");
    showToast("Pending bill save ho gaya", "success");
  });

  $("form-add-udhari")?.addEventListener("submit", ev => {
    ev.preventDefault();
    const phone = $("ud-phone").value.replace(/\D/g, "");
    udhariEntries.push({
      id: "ud-" + Date.now(),
      name: $("ud-name").value.trim(),
      phone,
      amount: parseFloat($("ud-amount").value),
      date: $("ud-date").value,
      note: $("ud-note").value.trim(),
      payments: []
    });
    saveData(); renderKhata();
    closeModal("modal-add-udhari");
    showToast("Udhari save ho gayi", "success");
  });

  // Payment Form Submission (Handles single bill OR customer-wide multi-bill settlement)
  $("form-khata-pay")?.addEventListener("submit", ev => {
    ev.preventDefault();
    const type = $("kp-type").value;
    const id = $("kp-id").value;
    const amt = parseFloat($("kp-amount").value);
    const dateVal = $("kp-date").value || khataToday();
    const modeVal = $("kp-mode").value;

    if (!(amt > 0)) return;

    if (type === "customer_udhari") {
      // Settle across multiple pending bills for this customer (Oldest first - FIFO)
      const groups = groupUdhariByCustomer(udhariEntries);
      const g = groups.find(x => x.key === id);
      if (!g) return;

      if (amt > g.totalDue + 0.01) {
        showToast(`Kul baaki sirf ${khataMoney(g.totalDue)} hai`, "warning");
        return;
      }

      let remainingPayment = amt;
      // Sort oldest first for settlement
      const pendingToSettle = g.bills
        .filter(b => khataBalance(b) > 0)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      pendingToSettle.forEach(b => {
        if (remainingPayment <= 0) return;
        const bBal = khataBalance(b);
        const applyAmt = Math.min(bBal, remainingPayment);
        b.payments = b.payments || [];
        b.payments.push({
          amount: applyAmt,
          date: dateVal,
          mode: modeVal + " (Account Settlement)"
        });
        remainingPayment -= applyAmt;

        // Sync with invoice
        if ((b.invoiceId || b.invoiceNumber) && typeof invoices !== "undefined") {
          const inv = invoices.find(i => i.id === b.invoiceId || i.invoiceNumber === b.invoiceNumber);
          if (inv) {
            inv.balanceDue = khataBalance(b);
            if (inv.balanceDue <= 0) inv.paymentMode = "Paid (Khata Clear)";
          }
        }
      });

      saveData();
      renderKhata();
      if (typeof renderAll === "function") renderAll();
      closeModal("modal-khata-pay");
      showToast(`✅ ${khataMoney(amt)} jama ho gaya!`, "success");
      return;
    }

    // Standard single entry payment (bill or single udhari entry)
    const list = type === "bill" ? supplierBills : udhariEntries;
    const e = list.find(x => x.id === id);
    if (!e) return;
    const bal = khataBalance(e);
    if (amt > bal + 0.001) {
      showToast(`Baaki sirf ${khataMoney(bal)} hai`, "warning");
      return;
    }

    e.payments = e.payments || [];
    e.payments.push({ amount: amt, date: dateVal, mode: modeVal });

    // Sync with original invoice if this Udhari was created from a bill
    if (type === "udhari" && (e.invoiceId || e.invoiceNumber) && typeof invoices !== "undefined") {
      const inv = invoices.find(i => i.id === e.invoiceId || i.invoiceNumber === e.invoiceNumber);
      if (inv) {
        const newBal = khataBalance(e);
        inv.balanceDue = newBal;
        if (newBal <= 0) {
          inv.paymentMode = "Paid (Khata Clear)";
        }
        if (typeof renderInvoicesTable === "function") renderInvoicesTable();
      }
    }

    saveData();
    renderKhata();
    if (typeof renderAll === "function") renderAll();
    closeModal("modal-khata-pay");
    showToast(type === "bill" ? "Payment save ho gayi" : `Jama ho gaya! Baaki: ${khataMoney(khataBalance(e))}`, "success");
  });

  renderKhata();
});

// Global helpers accessible by app.js and buttons
window.viewBillFromUdhari = function(billIdentifier) {
  if (typeof invoices === "undefined" || !invoices || invoices.length === 0) {
    showToast("Bill records nahi mile", "warning");
    return;
  }
  const inv = invoices.find(i => i.invoiceNumber === billIdentifier || i.id === billIdentifier);
  if (inv && typeof openReceiptModal === "function") {
    openReceiptModal(inv);
  } else {
    showToast(`Bill ${billIdentifier} nahi mila`, "warning");
  }
};

window.renderKhata = renderKhata;
window.renderUdhari = renderUdhari;
window.khataBalance = khataBalance;
window.khataMoney = khataMoney;
window.khataToday = khataToday;
window.toggleCustomerAccordion = toggleCustomerAccordion;
window.openCustomerLedgerModal = openCustomerLedgerModal;
window.openKhataCustomerPay = openKhataCustomerPay;
window.sendCustomerAllBillsWhatsApp = sendCustomerAllBillsWhatsApp;