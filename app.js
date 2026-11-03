/**
 * General Store Stock, Billing & Digital WhatsApp Receipt Manager
 * Offline-first store management with customer WhatsApp bill sending.
 */

// Initial Sample Products
const INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Aashirvaad Shudh Chakki Atta 5kg",
    category: "Grains & Flour",
    unit: "Packets",
    costPrice: 210,
    sellingPrice: 245,
    currentStock: 18,
    minStock: 5,
    barcode: "890103000001",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-2",
    name: "Fortune Sunlite Sunflower Oil 1L",
    category: "Cooking Oils & Ghee",
    unit: "Liters",
    costPrice: 115,
    sellingPrice: 135,
    currentStock: 24,
    minStock: 8,
    barcode: "890103000002",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-3",
    name: "Tata Salt Vaccum Evaporated 1kg",
    category: "Spices & Salt",
    unit: "Packets",
    costPrice: 22,
    sellingPrice: 28,
    currentStock: 45,
    minStock: 10,
    barcode: "890103000003",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-4",
    name: "Tata Tea Gold 500g",
    category: "Tea, Coffee & Drinks",
    unit: "Packets",
    costPrice: 260,
    sellingPrice: 310,
    currentStock: 14,
    minStock: 5,
    barcode: "890103000004",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-5",
    name: "Toor Dal Premium Unpolished 1kg",
    category: "Pulses & Dals",
    unit: "kg",
    costPrice: 140,
    sellingPrice: 170,
    currentStock: 16,
    minStock: 6,
    barcode: "890103000005",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-6",
    name: "Parle-G Gold Biscuits 1kg Family Pack",
    category: "Snacks & Biscuits",
    unit: "Packets",
    costPrice: 75,
    sellingPrice: 90,
    currentStock: 22,
    minStock: 8,
    barcode: "890103000006",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-7",
    name: "Dettol Original Bath Soap (Buy 3 Get 1)",
    category: "Soaps & Detergents",
    unit: "Packets",
    costPrice: 140,
    sellingPrice: 175,
    currentStock: 6,
    minStock: 8,
    barcode: "890103000007",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-8",
    name: "Amul Taaza Homogenised Toned Milk 500ml",
    category: "Dairy & Bakery",
    unit: "Packets",
    costPrice: 26,
    sellingPrice: 28,
    currentStock: 3,
    minStock: 10,
    barcode: "890103000008",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-9",
    name: "Surf Excel Easy Wash Detergent Powder 1kg",
    category: "Household & Cleaning",
    unit: "Packets",
    costPrice: 110,
    sellingPrice: 130,
    currentStock: 12,
    minStock: 4,
    barcode: "890103000009",
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-10",
    name: "Colgate MaxFresh Red Gel Toothpaste 150g",
    category: "Personal Care",
    unit: "Pieces",
    costPrice: 82,
    sellingPrice: 98,
    currentStock: 0,
    minStock: 5,
    barcode: "890103000010",
    updatedAt: new Date().toISOString()
  }
];

// Initial Registered Customers
const INITIAL_CUSTOMERS = [
  {
    id: "cust-1",
    name: "Rahul Sharma",
    phone: "9876543210",
    address: "House #12, Near Temple",
    totalVisits: 4,
    totalSpent: 1850,
    lastVisit: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "cust-2",
    name: "Sunita Devi",
    phone: "9812345678",
    address: "Flat 204, Green Heights",
    totalVisits: 2,
    totalSpent: 920,
    lastVisit: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "cust-3",
    name: "Amit Kumar Patel",
    phone: "9898989898",
    address: "Main Bazar Shop #4",
    totalVisits: 6,
    totalSpent: 3450,
    lastVisit: new Date(Date.now() - 43200000).toISOString()
  }
];

// App State
let products = [];
let restockHistory = [];
let salesHistory = [];
let invoices = [];
let customers = [];
let supplierBills = [];   // jo bill humein supplier ko dene hain
let udhariEntries = [];   // jo udhari customers se leni hai
let cart = [];
let selectedPayMode = "Cash"; // Cash or UPI (GPay QR)

let posCategoryFilter = "";
let activeInvoiceForModal = null;
let settings = {
  storeName: "My General Store",
  storePhone: "",
  currency: "₹"
};
let activeFilter = "all"; // 'all', 'low', 'out'

// LocalStorage Keys
const STORAGE_KEYS = {
  PRODUCTS: "gs_inventory_products_v1",
  RESTOCK: "gs_restock_history_v1",
  SALES: "gs_sales_history_v1",
  INVOICES: "gs_invoices_history_v1",
  CUSTOMERS: "gs_registered_customers_v1",
  SUPPLIER_BILLS: "gs_supplier_bills_v1",
  UDHARI: "gs_customer_udhari_v1",
  SETTINGS: "gs_store_settings_v1"
};

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEventListeners();
  renderAll();
});

function loadData() {
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const savedRestock = localStorage.getItem(STORAGE_KEYS.RESTOCK);
    const savedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    const savedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedSBills = localStorage.getItem(STORAGE_KEYS.SUPPLIER_BILLS);
    const savedUdhari = localStorage.getItem(STORAGE_KEYS.UDHARI);
    supplierBills = savedSBills ? JSON.parse(savedSBills) : [];
    udhariEntries = savedUdhari ? JSON.parse(savedUdhari) : [];

    products = savedProducts ? JSON.parse(savedProducts) : [...INITIAL_PRODUCTS];
    restockHistory = savedRestock ? JSON.parse(savedRestock) : [];
    salesHistory = savedSales ? JSON.parse(savedSales) : [];
    invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    customers = savedCustomers ? JSON.parse(savedCustomers) : [...INITIAL_CUSTOMERS];
    if (savedSettings) {
      settings = { ...settings, ...JSON.parse(savedSettings) };
    }
  } catch (err) {
    console.error("Failed to load stored data, using defaults:", err);
    products = [...INITIAL_PRODUCTS];
    customers = [...INITIAL_CUSTOMERS];
  }
  saveData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.RESTOCK, JSON.stringify(restockHistory));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(salesHistory));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_BILLS, JSON.stringify(supplierBills));
    localStorage.setItem(STORAGE_KEYS.UDHARI, JSON.stringify(udhariEntries));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
    showToast("Error saving data to browser storage", "danger");
  }
}

// ================= RENDER FUNCTIONS =================
function renderAll() {
  updateHeaderAndSettings();
  renderStats();
  renderCategoryFilter();
  renderInventoryTable();
  renderRestockHistory();
  renderSalesHistory();
  populateProductDropdowns();

  // POS Billing & Customer Renders
  initPosBillHeader();
  renderPosCategories();
  renderPosProducts();
  renderPosCart();
  renderInvoicesTable();
  renderCustomersTable();
  populateCustomerDatalist();
  if (typeof renderKhata === "function") renderKhata();
}

function updateHeaderAndSettings() {
  document.getElementById("display-store-name").textContent = settings.storeName || "My General Store";
  document.getElementById("print-store-name").textContent = `${settings.storeName} - Inventory Stock Report`;
  document.getElementById("print-date").textContent = `Printed On: ${new Date().toLocaleString()}`;
  document.getElementById("setting-store-name").value = settings.storeName || "My General Store";
  document.getElementById("setting-store-phone").value = settings.storePhone || "";
  document.getElementById("setting-currency").value = settings.currency || "₹";
}

function renderStats() {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((acc, p) => acc + Number(p.currentStock || 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + (Number(p.currentStock || 0) * Number(p.costPrice || 0)), 0);
  const lowStockCount = products.filter(p => Number(p.currentStock) <= Number(p.minStock) && Number(p.currentStock) > 0).length;

  document.getElementById("stat-total-products").textContent = totalProducts;
  document.getElementById("stat-total-quantity").textContent = totalQuantity.toLocaleString();
  document.getElementById("stat-stock-value").textContent = `${settings.currency}${Math.round(totalStockValue).toLocaleString()}`;
  document.getElementById("stat-low-stock").textContent = lowStockCount;
}

function renderCategoryFilter() {
  const catSelect = document.getElementById("category-filter");
  const currentVal = catSelect.value;
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();

  catSelect.innerHTML = '<option value="">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });
  catSelect.value = currentVal;
}

// ================= INVENTORY TABLE =================
function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  const emptyMsg = document.getElementById("no-products-msg");
  const search = document.getElementById("inventory-search").value.toLowerCase().trim();
  const catFilter = document.getElementById("category-filter").value;

  tbody.innerHTML = "";

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      (p.category && p.category.toLowerCase().includes(search)) ||
      (p.barcode && p.barcode.toLowerCase().includes(search));

    const matchCat = !catFilter || p.category === catFilter;

    let matchPill = true;
    const stock = Number(p.currentStock);
    const min = Number(p.minStock || 5);
    if (activeFilter === "low") {
      matchPill = stock <= min && stock > 0;
    } else if (activeFilter === "out") {
      matchPill = stock <= 0;
    }

    return matchSearch && matchCat && matchPill;
  });

  if (filtered.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  filtered.forEach(p => {
    const tr = document.createElement("tr");
    const stock = Number(p.currentStock);
    const min = Number(p.minStock || 5);

    let statusBadge = "";
    if (stock <= 0) {
      statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
    } else if (stock <= min) {
      statusBadge = `<span class="badge badge-warning">Low Stock (≤ ${min})</span>`;
    } else {
      statusBadge = `<span class="badge badge-success">In Stock</span>`;
    }

    const margin = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;

    tr.innerHTML = `
      <td>
        <div class="product-cell">
          <span class="product-name">${escapeHtml(p.name)}</span>
          ${p.barcode ? `<span class="product-code">Barcode: ${escapeHtml(p.barcode)}</span>` : ""}
        </div>
      </td>
      <td>
        <span class="badge badge-category">${escapeHtml(p.category || "General")}</span>
      </td>
      <td>${escapeHtml(p.unit || "Packets")}</td>
      <td>${settings.currency}${Number(p.costPrice).toFixed(2)}</td>
      <td>
        <span class="price-text">${settings.currency}${Number(p.sellingPrice).toFixed(2)}</span>
        <span style="font-size: 0.72rem; color: #16a34a; font-weight: 600; margin-left: 4px;">(+${margin}%)</span>
      </td>
      <td>
        <span class="stock-value" style="color: ${stock <= min ? '#b45309' : '#0f172a'};">
          ${stock} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${escapeHtml(p.unit)}</span>
        </span>
      </td>
      <td>${statusBadge}</td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end;">
          <button class="btn btn-sm btn-success" onclick="quickRestockRow('${p.id}')" title="Add Incoming Delivery Stock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            + Stock
          </button>
          <button class="btn btn-sm btn-outline" onclick="openUpdateModal('${p.id}')" title="Update Details & Price">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Update
          </button>
          <button class="btn btn-sm btn-outline" onclick="quickSaleRow('${p.id}')" title="Sell item" ${stock <= 0 ? 'disabled style="opacity: 0.5;"' : ''}>
            Sell
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" title="Delete Product" style="padding: 5px 8px;">
            &times;
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= RESTOCK & SALES LOGS =================
function renderRestockHistory() {
  const tbody = document.getElementById("restock-history-body");
  const emptyMsg = document.getElementById("no-history-msg");
  tbody.innerHTML = "";

  if (restockHistory.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  const sorted = [...restockHistory].reverse();

  sorted.forEach(item => {
    const tr = document.createElement("tr");
    const dateStr = item.date ? new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A";

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</td>
      <td style="font-weight: 600;">${escapeHtml(item.productName)}</td>
      <td>${item.previousStock}</td>
      <td style="color: #16a34a; font-weight: 700;">+ ${item.incomingQty}</td>
      <td>
        <strong style="color: #0f172a; background: #e0f2fe; padding: 3px 8px; border-radius: 4px;">
          = ${item.totalStock}
        </strong>
      </td>
      <td>${item.costPrice ? `${settings.currency}${Number(item.costPrice).toFixed(2)}` : "-"}</td>
      <td style="font-size: 0.85rem; color: #475569;">${escapeHtml(item.supplier || "-")}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSalesHistory() {
  const tbody = document.getElementById("sales-history-body");
  const emptyMsg = document.getElementById("no-sales-msg");
  tbody.innerHTML = "";

  if (salesHistory.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  const sorted = [...salesHistory].reverse();

  sorted.forEach(sale => {
    const tr = document.createElement("tr");
    const dateStr = sale.date ? new Date(sale.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A";

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</td>
      <td style="font-weight: 600;">${escapeHtml(sale.productName)}</td>
      <td>${sale.qtySold}</td>
      <td>${settings.currency}${Number(sale.sellingPrice).toFixed(2)}</td>
      <td style="font-weight: 700; color: #166534;">${settings.currency}${Number(sale.totalAmount).toFixed(2)}</td>
      <td>${sale.remainingStock}</td>
    `;
    tbody.appendChild(tr);
  });
}

function populateProductDropdowns() {
  const stockinSelect = document.getElementById("stockin-product-select");
  const saleSelect = document.getElementById("sale-product-select");

  const currentStockinVal = stockinSelect.value;
  const currentSaleVal = saleSelect.value;

  stockinSelect.innerHTML = '<option value="">-- Choose Product to Restock --</option>';
  saleSelect.innerHTML = '<option value="">-- Choose Product Sold --</option>';

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(p => {
    const opt1 = document.createElement("option");
    opt1.value = p.id;
    opt1.textContent = `${p.name} (Current Stock: ${p.currentStock} ${p.unit})`;
    stockinSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = p.id;
    opt2.textContent = `${p.name} (In Stock: ${p.currentStock} ${p.unit} - ${settings.currency}${p.sellingPrice})`;
    saleSelect.appendChild(opt2);
  });

  stockinSelect.value = currentStockinVal;
  saleSelect.value = currentSaleVal;
}

// ================= CUSTOMER MANAGEMENT & LOOKUP =================
function populateCustomerDatalist() {
  const datalist = document.getElementById("customer-phone-datalist");
  if (!datalist) return;
  datalist.innerHTML = "";
  customers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.phone;
    opt.label = `${c.name} (${c.phone})`;
    datalist.appendChild(opt);
  });
}

function onCustomerPhoneInput() {
  const phoneInput = document.getElementById("pos-customer-phone");
  const nameInput = document.getElementById("pos-customer-name");
  const statusElem = document.getElementById("pos-customer-status");
  if (!phoneInput) return;
  const rawPhone = phoneInput.value.replace(/\D/g, "");

  let isRegistered = false;
  if (rawPhone.length >= 4) {
    const match = customers.find(c => c.phone.replace(/\D/g, "") === rawPhone);
    if (match) {
      isRegistered = true;
      if (nameInput && (!nameInput.value || nameInput.value === "Walk-in Customer")) {
        nameInput.value = match.name;
      }
      if (statusElem) {
        statusElem.innerHTML = `
          <span style="color: #166534; font-weight: 600;">
            🟢 Registered: ${escapeHtml(match.name)} (${match.totalVisits || 1} bills, ${settings.currency}${match.totalSpent || 0} total spent)
          </span>
        `;
      }
    }
  }

  if (!isRegistered && statusElem) {
    if (rawPhone.length === 10) {
      statusElem.innerHTML = `
        <span style="color: #2563eb; font-weight: 500;">
          ➕ New Mobile: Will be registered automatically on checkout
        </span>
      `;
    } else {
      statusElem.innerHTML = `
        <span style="color: var(--text-muted);">
          💡 Enter 10-digit mobile to send bill on WhatsApp & register customer
        </span>
      `;
    }
  }

  // Check if customer has existing pending udhari
  const dueElem = document.getElementById("pos-customer-previous-due");
  if (dueElem) {
    if (rawPhone.length >= 4) {
      const custEntries = udhariEntries.filter(u => (u.phone || "").replace(/\D/g, "") === rawPhone);
      const totalPending = custEntries.reduce((acc, u) => {
        const bal = typeof khataBalance === "function" 
          ? khataBalance(u) 
          : Math.max(0, Number(u.amount) - (u.payments || []).reduce((t, p) => t + Number(p.amount), 0));
        return acc + bal;
      }, 0);
      if (totalPending > 0) {
        dueElem.style.display = "block";
        dueElem.innerHTML = `⚠️ <b>Purana Khata Baaki:</b> Is customer ka pehle se <b>${settings.currency}${totalPending.toFixed(2)}</b> udhari baaki hai. <button type="button" class="btn btn-sm btn-outline" onclick="goToCustomerKhata('${rawPhone}')" style="padding:2px 8px;margin-left:6px;font-size:0.75rem;background:#fff;">Khata Dekhein</button>`;
      } else {
        dueElem.style.display = "none";
      }
    } else {
      dueElem.style.display = "none";
    }
  }

  checkCustomerUdhariRequired();
}

function saveOrUpdateCustomer(name, phone, billAmount) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone) return null;

  let existing = customers.find(c => c.phone.replace(/\D/g, "") === cleanPhone);

  if (existing) {
    if (name && name !== "Walk-in Customer") {
      existing.name = name;
    }
    existing.totalVisits = (existing.totalVisits || 0) + 1;
    existing.totalSpent = (existing.totalSpent || 0) + (billAmount || 0);
    existing.lastVisit = new Date().toISOString();
  } else {
    existing = {
      id: "cust-" + Date.now(),
      name: name || "Customer " + cleanPhone.slice(-4),
      phone: cleanPhone,
      address: "",
      totalVisits: 1,
      totalSpent: billAmount || 0,
      lastVisit: new Date().toISOString()
    };
    customers.push(existing);
  }

  saveData();
  populateCustomerDatalist();
  renderCustomersTable();
  return existing;
}

function renderCustomersTable() {
  const tbody = document.getElementById("customers-table-body");
  const emptyMsg = document.getElementById("no-customers-msg");
  const searchInput = document.getElementById("customer-search");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = customers.filter(c => {
    return !search ||
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search));
  });

  if (filtered.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  filtered.forEach(c => {
    const tr = document.createElement("tr");
    const lastDate = c.lastVisit ? new Date(c.lastVisit).toLocaleDateString([], { dateStyle: 'medium' }) : "N/A";
    const custDue = udhariEntries
      .filter(u => (u.phone || "").replace(/\D/g, "") === c.phone.replace(/\D/g, ""))
      .reduce((sum, u) => sum + (typeof khataBalance === 'function' ? khataBalance(u) : Math.max(0, Number(u.amount) - (u.payments || []).reduce((t, p) => t + Number(p.amount), 0))), 0);

    tr.innerHTML = `
      <td>
        <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <span>${escapeHtml(c.name)}</span>
          ${custDue > 0 ? `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-weight:700;font-size:0.72rem;" title="Pending Khata Udhari">Baaki: ${settings.currency}${custDue.toFixed(2)}</span>` : ""}
        </div>
        ${c.address ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.address)}</div>` : ""}
      </td>
      <td>
        <span style="font-weight: 600; color: #1e40af; font-family: monospace;">+91 ${escapeHtml(c.phone)}</span>
      </td>
      <td>${c.totalVisits || 1} purchases</td>
      <td><strong style="color: #166534;">${settings.currency}${Number(c.totalSpent || 0).toFixed(2)}</strong></td>
      <td style="color: var(--text-muted); font-size: 0.82rem;">${lastDate}</td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end;">
          <button class="btn btn-sm btn-primary" onclick="startBillForCustomer('${c.phone}', '${escapeHtml(c.name)}')" title="New Bill for this customer">
            + New Bill
          </button>
          ${custDue > 0 ? `<button class="btn btn-sm btn-outline" onclick="goToCustomerKhata('${c.phone}')" style="color:#b45309;font-weight:600;" title="Customer Udhari Khata Dekhein">📒 Khata</button>` : ""}
          <button class="btn btn-sm btn-whatsapp" onclick="directMessageCustomer('${c.phone}', '${escapeHtml(c.name)}')" title="Send WhatsApp Message">
            📲 WhatsApp
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')" title="Delete customer" style="padding: 5px 8px;">
            &times;
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function startBillForCustomer(phone, name) {
  switchTab("tab-billing");
  document.getElementById("pos-customer-phone").value = phone;
  document.getElementById("pos-customer-name").value = name;
  onCustomerPhoneInput();
  showToast(`Billing started for ${name}`, "info");
}

function directMessageCustomer(phone, name) {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10) clean = "91" + clean;
  const greeting = encodeURIComponent(`Hello ${name},\nGreetings from *${settings.storeName}*! How may we assist you today?`);
  window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${greeting}`, "_blank");
}

function deleteCustomer(id) {
  const c = customers.find(item => item.id === id);
  if (!c) return;
  if (confirm(`Remove registered customer "${c.name}"?`)) {
    customers = customers.filter(item => item.id !== id);
    saveData();
    renderCustomersTable();
    populateCustomerDatalist();
    showToast(`Removed "${c.name}"`, "warning");
  }
}

// ================= WHATSAPP DIGITAL BILL GENERATOR =================
function formatWhatsAppBill(invoice) {
  const dateStr = new Date(invoice.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  let text = `🧾 *${settings.storeName.toUpperCase()}*\n`;
  if (settings.storePhone) {
    text += `📞 Mobile/WhatsApp: +91 ${settings.storePhone}\n`;
  }
  text += `📍 Kirana & General Store\n`;
  text += `--------------------------------\n`;
  text += `*INVOICE:* ${invoice.invoiceNumber}\n`;
  text += `*DATE:* ${dateStr}\n`;
  text += `*CUSTOMER:* ${invoice.customerName}\n`;
  if (invoice.customerPhone) {
    text += `*MOBILE:* +91 ${invoice.customerPhone}\n`;
  }
  text += `--------------------------------\n`;
  text += `*ITEMS PURCHASED:*\n`;

  invoice.items.forEach((item, idx) => {
    text += `${idx + 1}. *${item.name}*\n   ${item.qty} ${item.unit} x ${settings.currency}${Number(item.price).toFixed(2)} = *${settings.currency}${Number(item.lineTotal).toFixed(2)}*\n`;
  });

  text += `--------------------------------\n`;
  text += `Subtotal: ${settings.currency}${invoice.subtotal.toFixed(2)}\n`;
  if (invoice.discount > 0) {
    text += `Discount: -${settings.currency}${invoice.discount.toFixed(2)}\n`;
  }
  text += `*GRAND TOTAL: ${settings.currency}${invoice.grandTotal.toFixed(2)}*\n`;
  if (invoice.isUdhari || (invoice.paymentMode && invoice.paymentMode.toLowerCase().includes("udhari"))) {
    text += `Payment Mode: 📒 ${invoice.paymentMode}\n`;
    if (invoice.advancePaid > 0) {
      text += `Advance Received: ${settings.currency}${Number(invoice.advancePaid).toFixed(2)}\n`;
    }
    text += `*BAAKI UDHARI (Due Balance): ${settings.currency}${Number(invoice.balanceDue || 0).toFixed(2)}*\n`;
    if (invoice.udhariDueDate) {
      text += `Promise / Due Date: ${invoice.udhariDueDate}\n`;
    }
    text += `--------------------------------\n`;
    text += `⚠️ *Aapka khata update ho gaya hai. Kripya baaki rakam samay par jama karein.*\n`;
  } else {
    text += `Payment Mode: ${invoice.paymentMode}\n`;
    text += `--------------------------------\n`;
  }
  text += `🙏 *Thank you for shopping with us!*\n`;
  text += `Please visit again! 😊`;

  return text;
}

function sendBillWhatsApp(invoice) {
  let phone = invoice.customerPhone;

  if (!phone) {
    phone = prompt(`Please enter customer 10-digit mobile number for ${invoice.invoiceNumber}:`);
    if (!phone) return;
    invoice.customerPhone = phone.replace(/\D/g, "");
    saveOrUpdateCustomer(invoice.customerName, invoice.customerPhone, invoice.grandTotal);
    saveData();
    renderInvoicesTable();
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  if (cleanPhone.length < 10) {
    showToast("Invalid mobile number for WhatsApp", "warning");
    return;
  }

  const message = formatWhatsAppBill(invoice);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
  showToast(`Opening WhatsApp for +${cleanPhone}...`, "success");
}

function sendBillSMS(invoice) {
  let phone = invoice.customerPhone;
  if (!phone) {
    phone = prompt("Enter customer 10-digit mobile number:");
    if (!phone) return;
  }
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10) clean = "91" + clean;

  const shortMsg = `${settings.storeName}: Thanks ${invoice.customerName}! Your bill ${invoice.invoiceNumber} of ${settings.currency}${invoice.grandTotal.toFixed(2)} (${invoice.items.length} items) is generated. Thank you, visit again!`;
  window.open(`sms:${clean}?body=${encodeURIComponent(shortMsg)}`, "_blank");
}

// ================= POS BILLING FUNCTIONS =================
function initPosBillHeader() {
  const nextNum = 1000 + (invoices.length + 1);
  const invoiceNumElem = document.getElementById("pos-invoice-num");
  if (invoiceNumElem) {
    invoiceNumElem.textContent = `#INV-${nextNum}`;
  }
  const dateElem = document.getElementById("pos-bill-date");
  if (dateElem) {
    dateElem.textContent = `Date: ${new Date().toLocaleDateString([], { dateStyle: 'medium' })}`;
  }
}

function renderPosCategories() {
  const container = document.getElementById("pos-category-pills");
  if (!container) return;

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  container.innerHTML = "";

  const allPill = document.createElement("button");
  allPill.type = "button";
  allPill.className = `pos-cat-pill ${posCategoryFilter === "" ? "active" : ""}`;
  allPill.textContent = "All Items";
  allPill.addEventListener("click", () => {
    posCategoryFilter = "";
    renderPosCategories();
    renderPosProducts();
  });
  container.appendChild(allPill);

  categories.forEach(cat => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `pos-cat-pill ${posCategoryFilter === cat ? "active" : ""}`;
    pill.textContent = cat;
    pill.addEventListener("click", () => {
      posCategoryFilter = cat;
      renderPosCategories();
      renderPosProducts();
    });
    container.appendChild(pill);
  });
}

function renderPosProducts() {
  const grid = document.getElementById("pos-product-grid");
  if (!grid) return;

  const searchInput = document.getElementById("pos-search-input");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
  grid.innerHTML = "";

  const filtered = products.filter(p => {
    const matchCat = !posCategoryFilter || p.category === posCategoryFilter;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      (p.category && p.category.toLowerCase().includes(search)) ||
      (p.barcode && p.barcode.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <p>No products match your search</p>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    const stock = Number(p.currentStock || 0);
    const min = Number(p.minStock || 5);
    const isOut = stock <= 0;

    let stockClass = "pos-stock-ok";
    let stockText = `${stock} in stock`;
    if (isOut) {
      stockClass = "pos-stock-out";
      stockText = "Out of Stock";
    } else if (stock <= min) {
      stockClass = "pos-stock-low";
      stockText = `Low: ${stock} left`;
    }

    card.className = `pos-card ${isOut ? "out-of-stock" : ""}`;
    card.innerHTML = `
      <div>
        <div class="pos-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        <div class="pos-card-unit">${escapeHtml(p.unit)} • ${escapeHtml(p.category || 'General')}</div>
      </div>
      <div class="pos-card-footer">
        <span class="pos-card-price">${settings.currency}${Number(p.sellingPrice).toFixed(2)}</span>
        <span class="pos-card-stock ${stockClass}">${stockText}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      if (isOut) {
        showToast(`"${p.name}" is out of stock!`, "warning");
        return;
      }
      addToCart(p.id);
    });

    grid.appendChild(card);
  });
}

function handlePosSearchEnter() {
  const searchInput = document.getElementById("pos-search-input");
  const query = searchInput.value.toLowerCase().trim();
  if (!query) return;

  let match = products.find(p => p.barcode && p.barcode.toLowerCase() === query);
  if (!match) {
    match = products.find(p => p.name.toLowerCase() === query);
  }
  if (!match) {
    const partials = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
    if (partials.length === 1) {
      match = partials[0];
    }
  }

  if (match) {
    if (match.currentStock <= 0) {
      showToast(`"${match.name}" is out of stock!`, "warning");
    } else {
      addToCart(match.id);
      searchInput.value = "";
      renderPosProducts();
    }
  } else {
    showToast(`No exact product match for "${query}"`, "info");
  }
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.productId === productId);
  const currentQtyInCart = existing ? existing.qty : 0;

  if (currentQtyInCart + 1 > product.currentStock) {
    showToast(`Cannot add more. Only ${product.currentStock} ${product.unit} available in stock!`, "warning");
    return;
  }

  if (existing) {
    existing.qty += 1;
    existing.lineTotal = existing.qty * existing.price;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      price: Number(product.sellingPrice),
      qty: 1,
      maxStock: Number(product.currentStock),
      lineTotal: Number(product.sellingPrice)
    });
  }

  renderPosCart();
}

function updateCartQty(productId, newQty) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;

  const product = products.find(p => p.id === productId);
  const max = product ? Number(product.currentStock) : item.maxStock;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > max) {
    showToast(`Only ${max} ${item.unit} available in stock!`, "warning");
    item.qty = max;
  } else {
    item.qty = newQty;
  }

  item.lineTotal = item.qty * item.price;
  renderPosCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderPosCart();
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm("Clear current bill items?")) {
    cart = [];
    const disc = document.getElementById("pos-discount");
    if (disc) disc.value = "0";
    const cName = document.getElementById("pos-customer-name");
    if (cName) cName.value = "";
    const cPhone = document.getElementById("pos-customer-phone");
    if (cPhone) cPhone.value = "";
    const cCash = document.getElementById("pos-cash-received");
    if (cCash) cCash.value = "";
    onCustomerPhoneInput();
    renderPosCart();
    showToast("Bill cleared", "info");
  }
}

function renderPosCart() {
  const tbody = document.getElementById("pos-cart-tbody");
  const emptyElem = document.getElementById("pos-cart-empty");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (cart.length === 0) {
    if (emptyElem) emptyElem.style.display = "block";
  } else {
    if (emptyElem) emptyElem.style.display = "none";
    cart.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600; color: #0f172a; line-height: 1.2;">${escapeHtml(item.name)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(item.unit)}</div>
        </td>
        <td style="text-align: center;">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.qty - 1})">-</button>
            <input type="number" class="qty-input" value="${item.qty}" min="1" max="${item.maxStock}" onchange="updateCartQty('${item.productId}', parseFloat(this.value) || 1)">
            <button type="button" class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.qty + 1})">+</button>
          </div>
        </td>
        <td style="text-align: right; font-weight: 500;">${settings.currency}${item.price.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">${settings.currency}${item.lineTotal.toFixed(2)}</td>
        <td style="text-align: center;">
          <button type="button" onclick="removeFromCart('${item.productId}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 2px 6px;">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updatePosCalculations();
}

function updatePosCalculations() {
  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const discountInput = parseFloat(document.getElementById("pos-discount").value) || 0;
  const grandTotal = Math.max(0, subtotal - discountInput);

  const subElem = document.getElementById("pos-subtotal");
  if (subElem) subElem.textContent = `${settings.currency}${subtotal.toFixed(2)}`;

  const grandElem = document.getElementById("pos-grand-total");
  if (grandElem) grandElem.textContent = `${settings.currency}${grandTotal.toFixed(2)}`;
  const upiAmountElem = document.getElementById("pos-upi-amount");
  if (upiAmountElem) upiAmountElem.textContent = `${settings.currency}${grandTotal.toFixed(2)}`;

  const cashReceivedInput = document.getElementById("pos-cash-received");
  const cashReceivedVal = cashReceivedInput ? (parseFloat(cashReceivedInput.value) || 0) : 0;
  const changeElem = document.getElementById("pos-cash-change");

  if (changeElem) {
    if (cashReceivedVal > 0) {
      const change = Math.max(0, cashReceivedVal - grandTotal);
      changeElem.textContent = `${settings.currency}${change.toFixed(2)}`;
    } else {
      changeElem.textContent = `${settings.currency}0.00`;
    }
  }

  // Udhari Remaining Calculation
  const advInput = document.getElementById("pos-udhari-advance");
  const advVal = advInput ? (parseFloat(advInput.value) || 0) : 0;
  const udhariRemElem = document.getElementById("pos-udhari-remaining");
  if (udhariRemElem) {
    const rem = Math.max(0, grandTotal - advVal);
    udhariRemElem.textContent = `${settings.currency}${rem.toFixed(2)}`;
  }

  // Cash shortage tip
  const shortageTip = document.getElementById("pos-cash-shortage-tip");
  if (shortageTip) {
    if (selectedPayMode === "Cash" && cashReceivedVal > 0 && cashReceivedVal < grandTotal) {
      const diff = grandTotal - cashReceivedVal;
      shortageTip.style.display = "block";
      shortageTip.innerHTML = `⚠️ <b>${settings.currency}${diff.toFixed(2)} baaki hai.</b> <button type="button" onclick="setPayModeUdhariWithAdvance(${cashReceivedVal})" style="background:#b45309;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;font-weight:600;font-size:0.75rem;margin-left:6px;">+ Baaki Udhari me jodein</button>`;
    } else {
      shortageTip.style.display = "none";
    }
  }

  checkCustomerUdhariRequired();
}

// ================= CHECKOUT & INVOICING =================
function checkoutBill(options = {}) {
  const { sendWhatsApp = false, shouldPrint = false } = options;

  if (cart.length === 0) {
    showToast("Please add items to bill first", "warning");
    return;
  }

  if (selectedPayMode === "UPI" && !document.getElementById("pos-upi-payment-confirmed")?.checked) {
    showToast("Please verify the GPay payment and tick the confirmation box first.", "warning");
    return;
  }

  const isUdhari = (selectedPayMode === "Udhari" || selectedPayMode === "Partial");

  let phone = document.getElementById("pos-customer-phone").value.trim().replace(/\D/g, "");
  let customerName = document.getElementById("pos-customer-name").value.trim();

  // Validate mobile number for Udhari
  if (isUdhari) {
    if (!phone || phone.length < 10) {
      showToast("Udhari khate me jodne ke liye Customer ka 10-digit Mobile number zaroori hai!", "warning");
      const phInput = document.getElementById("pos-customer-phone");
      if (phInput) {
        phInput.focus();
        phInput.style.borderColor = "#ef4444";
        setTimeout(() => { if (phInput) phInput.style.borderColor = ""; }, 3000);
      }
      checkCustomerUdhariRequired();
      return;
    }
  }

  // Validate stock
  for (const item of cart) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod || prod.currentStock < item.qty) {
      showToast(`Insufficient stock for "${item.name}". Only ${prod ? prod.currentStock : 0} available.`, "danger");
      return;
    }
  }

  // If user clicked "Send on WhatsApp", require or prompt mobile number
  if (sendWhatsApp && !phone) {
    const pInput = prompt("Enter customer 10-digit mobile number for WhatsApp bill:");
    if (!pInput) {
      showToast("Mobile number is required to send WhatsApp bill", "warning");
      return;
    }
    phone = pInput.replace(/\D/g, "");
    document.getElementById("pos-customer-phone").value = phone;
  }

  if (!customerName) {
    customerName = phone ? `Customer ${phone.slice(-4)}` : "Walk-in Customer";
    document.getElementById("pos-customer-name").value = customerName;
  }

  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const discount = parseFloat(document.getElementById("pos-discount").value) || 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const advancePaid = isUdhari ? (parseFloat(document.getElementById("pos-udhari-advance")?.value) || 0) : grandTotal;
  const advanceMode = isUdhari ? (document.getElementById("pos-udhari-advance-mode")?.value || "Cash") : selectedPayMode;
  const udhariDueDate = isUdhari ? (document.getElementById("pos-udhari-due-date")?.value || "") : "";
  const userUdhariNote = isUdhari ? (document.getElementById("pos-udhari-note")?.value.trim() || "") : "";
  const balanceDue = isUdhari ? Math.max(0, grandTotal - advancePaid) : 0;

  const cashReceived = parseFloat(document.getElementById("pos-cash-received").value) || (isUdhari ? advancePaid : grandTotal);
  const changeReturn = isUdhari ? 0 : Math.max(0, cashReceived - grandTotal);
  const invoiceNum = document.getElementById("pos-invoice-num").textContent;

  // Deduct stock for each item & add to salesHistory
  cart.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.currentStock -= item.qty;
      prod.updatedAt = new Date().toISOString();

      salesHistory.push({
        id: "sale-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        productId: prod.id,
        productName: prod.name,
        qtySold: item.qty,
        sellingPrice: item.price,
        totalAmount: item.lineTotal,
        remainingStock: prod.currentStock,
        invoiceNum: invoiceNum,
        customer: customerName,
        date: new Date().toISOString()
      });
    }
  });

  // Save / update registered customer profile
  if (phone) {
    saveOrUpdateCustomer(customerName, phone, grandTotal);
  }

  let finalPaymentMode = selectedPayMode;
  if (isUdhari) {
    finalPaymentMode = advancePaid > 0 ? `Aadha ${advanceMode} + Udhari` : "Udhari (Khata)";
  }

  // Create invoice record
  const invoice = {
    id: "inv-" + Date.now(),
    invoiceNumber: invoiceNum,
    date: new Date().toISOString(),
    customerName: customerName,
    customerPhone: phone,
    items: [...cart],
    subtotal: subtotal,
    discount: discount,
    grandTotal: grandTotal,
    paymentMode: finalPaymentMode,
    isUdhari: isUdhari,
    advancePaid: isUdhari ? advancePaid : grandTotal,
    balanceDue: isUdhari ? balanceDue : 0,
    udhariDueDate: udhariDueDate,
    cashReceived: isUdhari ? advancePaid : cashReceived,
    changeReturn: isUdhari ? 0 : changeReturn
  };

  // AUTOMATIC SYNC TO CUSTOMER UDHARI SECTION
  if (isUdhari) {
    const itemsList = cart.map(i => `${i.name} (x${i.qty} ${i.unit})`).join(", ");
    const noteText = userUdhariNote
      ? `${userUdhariNote} · Bill ${invoiceNum}: ${itemsList}`
      : `Bill ${invoiceNum}: ${itemsList}`;

    const udhariEntry = {
      id: "ud-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      invoiceId: invoice.id,
      invoiceNumber: invoiceNum,
      name: customerName,
      phone: phone,
      amount: grandTotal, // Full bill recorded in customer khata
      date: typeof khataToday === "function" ? khataToday() : new Date().toISOString().slice(0, 10),
      dueDate: udhariDueDate,
      note: noteText,
      itemsSummary: itemsList,
      payments: advancePaid > 0 ? [
        {
          amount: advancePaid,
          date: typeof khataToday === "function" ? khataToday() : new Date().toISOString().slice(0, 10),
          mode: `Advance (${advanceMode})`
        }
      ] : []
    };

    udhariEntries.push(udhariEntry);
    invoice.udhariId = udhariEntry.id;
  }

  invoices.push(invoice);
  saveData();
  renderAll();
  if (typeof renderKhata === "function") {
    renderKhata();
  }

  if (isUdhari) {
    showToast(`✅ Bill ${invoiceNum} save hua! ${settings.currency}${balanceDue.toFixed(2)} Customer Udhari khate me jud gaya!`, "success");
  } else {
    showToast(`Bill ${invoiceNum} completed! Total: ${settings.currency}${grandTotal.toFixed(2)}`, "success");
  }

  // Send WhatsApp if chosen
  if (sendWhatsApp) {
    sendBillWhatsApp(invoice);
  }

  // Open receipt slip modal if print chosen
  if (shouldPrint) {
    openReceiptModal(invoice);
  }

  // Reset bill for next customer
  cart = [];
  const disc = document.getElementById("pos-discount");
  if (disc) disc.value = "0";
  const cName = document.getElementById("pos-customer-name");
  if (cName) cName.value = "";
  const cPhone = document.getElementById("pos-customer-phone");
  if (cPhone) cPhone.value = "";
  const cCash = document.getElementById("pos-cash-received");
  if (cCash) cCash.value = "";

  const advInp = document.getElementById("pos-udhari-advance");
  if (advInp) advInp.value = "0";
  const dueInp = document.getElementById("pos-udhari-due-date");
  if (dueInp) dueInp.value = "";
  const noteInp = document.getElementById("pos-udhari-note");
  if (noteInp) noteInp.value = "";
  const shortTip = document.getElementById("pos-cash-shortage-tip");
  if (shortTip) shortTip.style.display = "none";
  const prevDueElem = document.getElementById("pos-customer-previous-due");
  if (prevDueElem) prevDueElem.style.display = "none";
  const udhariAlert = document.getElementById("pos-udhari-cust-alert");
  if (udhariAlert) udhariAlert.style.display = "none";

  initPosBillHeader();
  renderPosCart();
  onCustomerPhoneInput();
}

function openReceiptModal(invoice) {
  activeInvoiceForModal = invoice;
  const area = document.getElementById("receipt-print-area");
  if (!area) return;

  const dateStr = new Date(invoice.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  let itemsHtml = "";
  invoice.items.forEach((item, idx) => {
    itemsHtml += `
      <tr>
        <td style="padding: 4px 0;">${idx + 1}. ${escapeHtml(item.name)}</td>
        <td style="text-align: center;">${item.qty} ${escapeHtml(item.unit)}</td>
        <td style="text-align: right;">${settings.currency}${Number(item.price).toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">${settings.currency}${Number(item.lineTotal).toFixed(2)}</td>
      </tr>
    `;
  });

  area.innerHTML = `
    <h2>${escapeHtml(settings.storeName)}</h2>
    <div class="receipt-sub">General Store & Grocery • Retail Invoice</div>
    <div class="receipt-divider"></div>
    <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
      <span><strong>Invoice:</strong> ${invoice.invoiceNumber}</span>
      <span>${dateStr}</span>
    </div>
    <div style="font-size: 0.8rem; margin-top: 4px;">
      <span><strong>Customer:</strong> ${escapeHtml(invoice.customerName)}</span>
      ${invoice.customerPhone ? `<br><span><strong>Mobile:</strong> +91 ${escapeHtml(invoice.customerPhone)}</span>` : ""}
    </div>
    <div class="receipt-divider"></div>

    <table class="receipt-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="receipt-divider"></div>

    <div class="receipt-total-row">
      <span>Subtotal:</span>
      <span>${settings.currency}${invoice.subtotal.toFixed(2)}</span>
    </div>
    ${invoice.discount > 0 ? `
      <div class="receipt-total-row" style="color: #16a34a;">
        <span>Discount:</span>
        <span>- ${settings.currency}${invoice.discount.toFixed(2)}</span>
      </div>
    ` : ""}

    <div class="receipt-grand-total">
      <span>GRAND TOTAL:</span>
      <span>${settings.currency}${invoice.grandTotal.toFixed(2)}</span>
    </div>

    ${invoice.isUdhari || (invoice.paymentMode && invoice.paymentMode.toLowerCase().includes("udhari")) ? `
      <div class="receipt-total-row" style="color: #b45309; font-weight: 700;">
        <span>Payment Mode:</span>
        <span>📒 ${escapeHtml(invoice.paymentMode)}</span>
      </div>
      ${invoice.advancePaid > 0 ? `
        <div class="receipt-total-row">
          <span>Advance Paid:</span>
          <span>${settings.currency}${Number(invoice.advancePaid).toFixed(2)}</span>
        </div>
      ` : ""}
      <div class="receipt-total-row" style="color: #b91c1c; font-weight: 800; font-size: 0.95rem; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
        <span>BAAKI UDHARI:</span>
        <span>${settings.currency}${Number(invoice.balanceDue || 0).toFixed(2)}</span>
      </div>
      ${invoice.udhariDueDate ? `
        <div class="receipt-total-row" style="font-size: 0.75rem; color: #64748b;">
          <span>Due Date:</span>
          <span>${escapeHtml(invoice.udhariDueDate)}</span>
        </div>
      ` : ""}
    ` : `
      <div class="receipt-total-row">
        <span>Payment Mode:</span>
        <span><strong>${invoice.paymentMode}</strong></span>
      </div>
      ${invoice.paymentMode === "Cash" && invoice.changeReturn > 0 ? `
        <div class="receipt-total-row">
          <span>Cash Paid:</span>
          <span>${settings.currency}${invoice.cashReceived.toFixed(2)}</span>
        </div>
        <div class="receipt-total-row">
          <span>Change Returned:</span>
          <span>${settings.currency}${invoice.changeReturn.toFixed(2)}</span>
        </div>
      ` : ""}
    `}

    <div class="receipt-divider"></div>
    <div class="receipt-footer">
      <p>*** THANK YOU! PLEASE VISIT AGAIN ***</p>
      <p style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">Digital bill sent to registered mobile</p>
    </div>
  `;

  openModal("modal-receipt");
}

function renderInvoicesTable() {
  const tbody = document.getElementById("invoices-table-body");
  const emptyMsg = document.getElementById("no-invoices-msg");
  const searchInput = document.getElementById("invoice-search");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = invoices.filter(inv => {
    return !search ||
      inv.invoiceNumber.toLowerCase().includes(search) ||
      inv.customerName.toLowerCase().includes(search) ||
      (inv.customerPhone && inv.customerPhone.includes(search));
  });

  if (filtered.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  const sorted = [...filtered].reverse();

  sorted.forEach(inv => {
    const tr = document.createElement("tr");
    const dateStr = new Date(inv.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const itemsCount = inv.items.reduce((acc, i) => acc + i.qty, 0);
    const isUdhariInv = inv.isUdhari || (inv.paymentMode && inv.paymentMode.toLowerCase().includes("udhari"));

    tr.innerHTML = `
      <td><strong style="color: var(--primary);">${escapeHtml(inv.invoiceNumber)}</strong></td>
      <td style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</td>
      <td style="font-weight: 600;">${escapeHtml(inv.customerName)}</td>
      <td>
        ${inv.customerPhone ? `<span style="font-family: monospace; color: #1e40af; font-weight:600;">+91 ${escapeHtml(inv.customerPhone)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Not registered</span>`}
      </td>
      <td>${itemsCount} items (${inv.items.length} lines)</td>
      <td>
        ${isUdhariInv ? `
          <span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-weight:600;">📒 ${escapeHtml(inv.paymentMode)}</span>
          ${inv.balanceDue > 0 ? `<div style="font-size:0.75rem;color:#b91c1c;font-weight:700;margin-top:2px;">Baaki: ${settings.currency}${Number(inv.balanceDue).toFixed(2)}</div>` : `<div style="font-size:0.72rem;color:#166534;font-weight:600;margin-top:2px;">(Khata Cleared)</div>`}
        ` : `
          <span class="badge badge-category">${escapeHtml(inv.paymentMode)}</span>
        `}
      </td>
      <td><strong style="color: #166534; font-size: 0.95rem;">${settings.currency}${Number(inv.grandTotal).toFixed(2)}</strong></td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end;">
          ${isUdhariInv && inv.customerPhone ? `
            <button class="btn btn-sm btn-outline" onclick="goToCustomerKhata('${inv.customerPhone}')" style="color:#b45309;font-weight:600;" title="Customer Khata Dekhein">
              📒 Khata
            </button>
          ` : ""}
          <button class="btn btn-sm btn-whatsapp" onclick="sendInvoiceWhatsAppById('${inv.id}')" title="Send Digital Bill on WhatsApp">
            📲 WhatsApp
          </button>
          <button class="btn btn-sm btn-outline" onclick="viewPastInvoice('${inv.id}')" title="View & Print Slip">
            Print Slip
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function sendInvoiceWhatsAppById(id) {
  const inv = invoices.find(i => i.id === id);
  if (inv) {
    sendBillWhatsApp(inv);
  }
}

function viewPastInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (inv) {
    openReceiptModal(inv);
  }
}

// ================= MODAL LOGIC (STOCK IN, UPDATE, ADD PRODUCT, QUICK SALE) =================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function updateStockInCalculation() {
  const productId = document.getElementById("stockin-product-select").value;
  const product = products.find(p => p.id === productId);
  const remainingElem = document.getElementById("calc-remaining-qty");
  const incomingElem = document.getElementById("calc-incoming-qty");
  const totalElem = document.getElementById("calc-new-total");
  const unitLabels = [
    document.getElementById("calc-unit-label"),
    document.getElementById("calc-unit-label2"),
    document.getElementById("calc-unit-label3")
  ];

  if (!product) {
    remainingElem.textContent = "0";
    incomingElem.textContent = "0";
    totalElem.textContent = "0";
    unitLabels.forEach(u => u.textContent = "units");
    return;
  }

  const remaining = Number(product.currentStock || 0);
  const incomingVal = parseFloat(document.getElementById("stockin-qty").value) || 0;
  const total = remaining + incomingVal;

  remainingElem.textContent = remaining;
  incomingElem.textContent = incomingVal;
  totalElem.textContent = total;
  unitLabels.forEach(u => u.textContent = product.unit || "units");
}

function quickRestockRow(productId) {
  const select = document.getElementById("stockin-product-select");
  select.value = productId;
  onStockinProductChange();
  openModal("modal-stockin");
  setTimeout(() => {
    document.getElementById("stockin-qty").focus();
  }, 200);
}

function onStockinProductChange() {
  const productId = document.getElementById("stockin-product-select").value;
  const product = products.find(p => p.id === productId);

  if (product) {
    document.getElementById("stockin-cost-price").value = product.costPrice || "";
    document.getElementById("stockin-selling-price").value = product.sellingPrice || "";
  } else {
    document.getElementById("stockin-cost-price").value = "";
    document.getElementById("stockin-selling-price").value = "";
  }
  updateStockInCalculation();
}

function openUpdateModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("update-product-id").value = product.id;
  document.getElementById("update-name").value = product.name;
  document.getElementById("update-category").value = product.category || "";
  document.getElementById("update-unit").value = product.unit || "Packets";
  document.getElementById("update-cost-price").value = product.costPrice;
  document.getElementById("update-selling-price").value = product.sellingPrice;
  document.getElementById("update-stock-qty").value = product.currentStock;
  document.getElementById("update-min-stock").value = product.minStock ?? 5;
  document.getElementById("update-barcode").value = product.barcode || "";

  openModal("modal-update-product");
}

function quickSaleRow(productId) {
  document.getElementById("sale-product-select").value = productId;
  onSaleProductChange();
  openModal("modal-sale");
  setTimeout(() => {
    document.getElementById("sale-qty").focus();
  }, 200);
}

function onSaleProductChange() {
  const productId = document.getElementById("sale-product-select").value;
  const product = products.find(p => p.id === productId);
  const qty = parseFloat(document.getElementById("sale-qty").value) || 0;

  if (product) {
    document.getElementById("sale-available-stock").textContent = `${product.currentStock} ${product.unit}`;
    document.getElementById("sale-unit-price").textContent = `${settings.currency}${Number(product.sellingPrice).toFixed(2)}`;
    document.getElementById("sale-total-amount").textContent = `${settings.currency}${(qty * product.sellingPrice).toFixed(2)}`;
  } else {
    document.getElementById("sale-available-stock").textContent = "0 units";
    document.getElementById("sale-unit-price").textContent = `${settings.currency}0.00`;
    document.getElementById("sale-total-amount").textContent = `${settings.currency}0.00`;
  }
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  // Navigation & Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      switchTab(targetId);
    });
  });

  const quickBillingBtn = document.getElementById("btn-quick-billing");
  if (quickBillingBtn) {
    quickBillingBtn.addEventListener("click", () => {
      switchTab("tab-billing");
    });
  }

  // Modals Openers
  document.getElementById("btn-open-stockin").addEventListener("click", () => {
    document.getElementById("form-stockin").reset();
    document.getElementById("stockin-date").value = formatDateTimeLocal(new Date());
    updateStockInCalculation();
    openModal("modal-stockin");
  });

  document.getElementById("btn-open-add-product").addEventListener("click", () => {
    document.getElementById("form-add-product").reset();
    openModal("modal-add-product");
  });

  document.getElementById("btn-open-sale").addEventListener("click", () => {
    document.getElementById("form-sale").reset();
    document.getElementById("sale-qty").value = 1;
    onSaleProductChange();
    openModal("modal-sale");
  });

  document.getElementById("btn-open-settings").addEventListener("click", () => {
    openModal("modal-settings");
  });

  const openAddCustBtn = document.getElementById("btn-open-add-customer");
  if (openAddCustBtn) {
    openAddCustBtn.addEventListener("click", () => {
      document.getElementById("form-add-customer").reset();
      openModal("modal-add-customer");
    });
  }

  // Modal Close
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      closeModal(modalId);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
    }
  });

  // Stock In Dynamic Triggers
  document.getElementById("stockin-product-select").addEventListener("change", onStockinProductChange);
  document.getElementById("stockin-qty").addEventListener("input", updateStockInCalculation);

  // Quick Sale Dynamic Triggers
  document.getElementById("sale-product-select").addEventListener("change", onSaleProductChange);
  document.getElementById("sale-qty").addEventListener("input", onSaleProductChange);

  // Inventory Search & Filter
  document.getElementById("inventory-search").addEventListener("input", renderInventoryTable);
  document.getElementById("category-filter").addEventListener("change", renderInventoryTable);

  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-filter");
      renderInventoryTable();
    });
  });

  // POS Billing Inputs
  const posSearchInput = document.getElementById("pos-search-input");
  if (posSearchInput) {
    posSearchInput.addEventListener("input", renderPosProducts);
    posSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlePosSearchEnter();
      }
    });
  }

  const clearPosSearchBtn = document.getElementById("pos-clear-search");
  if (clearPosSearchBtn) {
    clearPosSearchBtn.addEventListener("click", () => {
      if (posSearchInput) {
        posSearchInput.value = "";
        renderPosProducts();
        posSearchInput.focus();
      }
    });
  }

  const custPhoneInput = document.getElementById("pos-customer-phone");
  if (custPhoneInput) {
    custPhoneInput.addEventListener("input", onCustomerPhoneInput);
  }

  document.querySelectorAll(".pay-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pay-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPayMode = btn.getAttribute("data-mode");
      const cashBox = document.getElementById("pos-cash-calculator");
      const upiPanel = document.getElementById("pos-upi-qr-panel");
      const upiConfirm = document.getElementById("pos-upi-payment-confirmed");
      const udhariPanel = document.getElementById("pos-udhari-panel");

      if (cashBox) cashBox.style.display = selectedPayMode === "Cash" ? "grid" : "none";
      if (upiPanel) upiPanel.style.display = selectedPayMode === "UPI" ? "block" : "none";
      if (udhariPanel) udhariPanel.style.display = (selectedPayMode === "Udhari" || selectedPayMode === "Partial") ? "block" : "none";
      if (upiConfirm) upiConfirm.checked = false;

      const advInput = document.getElementById("pos-udhari-advance");
      if (advInput) {
        if (selectedPayMode === "Udhari") {
          advInput.value = "0";
        } else if (selectedPayMode === "Partial") {
          const cashRec = parseFloat(document.getElementById("pos-cash-received")?.value) || 0;
          if (cashRec > 0) advInput.value = cashRec;
        }
      }

      checkCustomerUdhariRequired();
      updatePosCalculations();
    });
  });

  const posDiscountInput = document.getElementById("pos-discount");
  if (posDiscountInput) posDiscountInput.addEventListener("input", updatePosCalculations);

  const posCashRecInput = document.getElementById("pos-cash-received");
  if (posCashRecInput) posCashRecInput.addEventListener("input", updatePosCalculations);

  const posUdhariAdvInput = document.getElementById("pos-udhari-advance");
  if (posUdhariAdvInput) posUdhariAdvInput.addEventListener("input", updatePosCalculations);

  const custNameInput = document.getElementById("pos-customer-name");
  if (custNameInput) custNameInput.addEventListener("input", checkCustomerUdhariRequired);

  // POS Checkout Buttons
  const completeWhatsappBtn = document.getElementById("btn-complete-and-whatsapp");
  if (completeWhatsappBtn) {
    completeWhatsappBtn.addEventListener("click", () => checkoutBill({ sendWhatsApp: true }));
  }

  const completePrintBtn = document.getElementById("btn-complete-and-print");
  if (completePrintBtn) {
    completePrintBtn.addEventListener("click", () => checkoutBill({ shouldPrint: true }));
  }

  const completeNoPrintBtn = document.getElementById("btn-complete-sale-noprint");
  if (completeNoPrintBtn) {
    completeNoPrintBtn.addEventListener("click", () => checkoutBill({ sendWhatsApp: false, shouldPrint: false }));
  }

  const clearCartBtn = document.getElementById("btn-clear-cart");
  if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);

  // Receipt Modal Action Buttons
  const modalWhatsappBtn = document.getElementById("btn-modal-send-whatsapp");
  if (modalWhatsappBtn) {
    modalWhatsappBtn.addEventListener("click", () => {
      if (activeInvoiceForModal) sendBillWhatsApp(activeInvoiceForModal);
    });
  }

  const modalSmsBtn = document.getElementById("btn-modal-send-sms");
  if (modalSmsBtn) {
    modalSmsBtn.addEventListener("click", () => {
      if (activeInvoiceForModal) sendBillSMS(activeInvoiceForModal);
    });
  }

  const printReceiptDialogBtn = document.getElementById("btn-print-receipt-dialog");
  if (printReceiptDialogBtn) {
    printReceiptDialogBtn.addEventListener("click", () => window.print());
  }

  // Searches in Tabs
  const invoiceSearchInput = document.getElementById("invoice-search");
  if (invoiceSearchInput) invoiceSearchInput.addEventListener("input", renderInvoicesTable);

  const customerSearchInput = document.getElementById("customer-search");
  if (customerSearchInput) customerSearchInput.addEventListener("input", renderCustomersTable);

  const exportInvoicesBtn = document.getElementById("btn-export-invoices-csv");
  if (exportInvoicesBtn) exportInvoicesBtn.addEventListener("click", exportInvoicesToCSV);

  // Form Submissions
  setupFormSubmissions();
}

function setupFormSubmissions() {
  // FORM: Stock In
  document.getElementById("form-stockin").addEventListener("submit", (e) => {
    e.preventDefault();
    const productId = document.getElementById("stockin-product-select").value;
    const incomingQty = parseFloat(document.getElementById("stockin-qty").value);
    const newCost = document.getElementById("stockin-cost-price").value;
    const newSelling = document.getElementById("stockin-selling-price").value;
    const supplier = document.getElementById("stockin-supplier").value.trim();
    const dateVal = document.getElementById("stockin-date").value || new Date().toISOString();

    const product = products.find(p => p.id === productId);
    if (!product || isNaN(incomingQty) || incomingQty <= 0) {
      showToast("Please enter a valid incoming quantity", "warning");
      return;
    }

    const previousStock = Number(product.currentStock || 0);
    const totalStock = previousStock + incomingQty;

    product.currentStock = totalStock;
    if (newCost !== "") product.costPrice = parseFloat(newCost);
    if (newSelling !== "") product.sellingPrice = parseFloat(newSelling);
    product.updatedAt = new Date().toISOString();

    restockHistory.push({
      id: "restock-" + Date.now(),
      productId: product.id,
      productName: product.name,
      previousStock: previousStock,
      incomingQty: incomingQty,
      totalStock: totalStock,
      costPrice: newCost !== "" ? parseFloat(newCost) : product.costPrice,
      sellingPrice: newSelling !== "" ? parseFloat(newSelling) : product.sellingPrice,
      supplier: supplier,
      date: dateVal
    });

    saveData();
    renderAll();
    closeModal("modal-stockin");
    showToast(`Stock updated! Total ${product.name} is now ${totalStock} ${product.unit}`, "success");
  });

  // FORM: Update Product & Price
  document.getElementById("form-update-product").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("update-product-id").value;
    const product = products.find(p => p.id === id);
    if (!product) return;

    product.name = document.getElementById("update-name").value.trim();
    product.category = document.getElementById("update-category").value.trim() || "General";
    product.unit = document.getElementById("update-unit").value;
    product.costPrice = parseFloat(document.getElementById("update-cost-price").value) || 0;
    product.sellingPrice = parseFloat(document.getElementById("update-selling-price").value) || 0;
    product.currentStock = parseFloat(document.getElementById("update-stock-qty").value) || 0;
    product.minStock = parseInt(document.getElementById("update-min-stock").value) || 0;
    product.barcode = document.getElementById("update-barcode").value.trim();
    product.updatedAt = new Date().toISOString();

    saveData();
    renderAll();
    closeModal("modal-update-product");
    showToast(`Updated details for "${product.name}"`, "success");
  });

  // FORM: Add Product
  document.getElementById("form-add-product").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("new-name").value.trim();
    const category = document.getElementById("new-category").value.trim() || "General";
    const unit = document.getElementById("new-unit").value;
    const costPrice = parseFloat(document.getElementById("new-cost-price").value) || 0;
    const sellingPrice = parseFloat(document.getElementById("new-selling-price").value) || 0;
    const initialStock = parseFloat(document.getElementById("new-stock-qty").value) || 0;
    const minStock = parseInt(document.getElementById("new-min-stock").value) || 5;
    const barcode = document.getElementById("new-barcode").value.trim();

    const newProd = {
      id: "prod-" + Date.now(),
      name,
      category,
      unit,
      costPrice,
      sellingPrice,
      currentStock: initialStock,
      minStock,
      barcode,
      updatedAt: new Date().toISOString()
    };

    products.push(newProd);

    if (initialStock > 0) {
      restockHistory.push({
        id: "restock-" + Date.now(),
        productId: newProd.id,
        productName: newProd.name,
        previousStock: 0,
        incomingQty: initialStock,
        totalStock: initialStock,
        costPrice: costPrice,
        sellingPrice: sellingPrice,
        supplier: "Initial Setup",
        date: new Date().toISOString()
      });
    }

    saveData();
    renderAll();
    closeModal("modal-add-product");
    showToast(`Added "${newProd.name}" to inventory!`, "success");
  });

  // FORM: Quick Sale
  document.getElementById("form-sale").addEventListener("submit", (e) => {
    e.preventDefault();
    const productId = document.getElementById("sale-product-select").value;
    const qty = parseFloat(document.getElementById("sale-qty").value);

    const product = products.find(p => p.id === productId);
    if (!product || isNaN(qty) || qty <= 0) {
      showToast("Please enter a valid quantity", "warning");
      return;
    }

    if (qty > product.currentStock) {
      showToast(`Cannot sell ${qty} units. Only ${product.currentStock} ${product.unit} available!`, "danger");
      return;
    }

    product.currentStock -= qty;
    const totalAmount = qty * product.sellingPrice;

    salesHistory.push({
      id: "sale-" + Date.now(),
      productId: product.id,
      productName: product.name,
      qtySold: qty,
      sellingPrice: product.sellingPrice,
      totalAmount: totalAmount,
      remainingStock: product.currentStock,
      date: new Date().toISOString()
    });

    saveData();
    renderAll();
    closeModal("modal-sale");
    showToast(`Sold ${qty} ${product.unit} of ${product.name} for ${settings.currency}${totalAmount.toFixed(2)}`, "success");
  });

  // FORM: Register Customer
  const addCustForm = document.getElementById("form-add-customer");
  if (addCustForm) {
    addCustForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("reg-cust-name").value.trim();
      const phone = document.getElementById("reg-cust-phone").value.trim().replace(/\D/g, "");
      const address = document.getElementById("reg-cust-address").value.trim();

      if (phone.length !== 10) {
        showToast("Please enter a valid 10-digit mobile number", "warning");
        return;
      }

      saveOrUpdateCustomer(name, phone, 0);
      const cust = customers.find(c => c.phone === phone);
      if (cust && address) cust.address = address;

      saveData();
      renderCustomersTable();
      populateCustomerDatalist();
      closeModal("modal-add-customer");
      showToast(`Registered customer "${name}" (+91 ${phone})`, "success");
    });
  }

  // SETTINGS & BACKUP ACTIONS
  document.getElementById("btn-save-settings").addEventListener("click", () => {
    settings.storeName = document.getElementById("setting-store-name").value.trim() || "My General Store";
    settings.storePhone = document.getElementById("setting-store-phone").value.trim().replace(/\D/g, "");
    settings.currency = document.getElementById("setting-currency").value || "₹";
    saveData();
    renderAll();
    closeModal("modal-settings");
    showToast("Settings saved!", "success");
  });

  document.getElementById("btn-export-excel").addEventListener("click", exportInventoryToCSV);
  document.getElementById("btn-export-restock-csv").addEventListener("click", exportRestockToCSV);
  document.getElementById("btn-export-sales-csv").addEventListener("click", exportSalesToCSV);
  document.getElementById("btn-backup-json").addEventListener("click", downloadJSONBackup);
  document.getElementById("input-restore-file").addEventListener("change", handleRestoreJSON);

  document.getElementById("btn-reset-sample-data").addEventListener("click", () => {
    if (confirm("Reset to sample products & customers? Current changes will be overwritten!")) {
      products = [...INITIAL_PRODUCTS];
      customers = [...INITIAL_CUSTOMERS];
      restockHistory = [];
      salesHistory = [];
      invoices = [];
      supplierBills = [];
      udhariEntries = [];
      cart = [];
      saveData();
      renderAll();
      closeModal("modal-settings");
      showToast("Reset to sample data", "warning");
    }
  });
}

function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (confirm(`Are you sure you want to remove "${product.name}" from inventory?`)) {
    products = products.filter(p => p.id !== id);
    saveData();
    renderAll();
    showToast(`Removed "${product.name}"`, "warning");
  }
}

// ================= CSV & EXPORT UTILITIES =================
function exportInventoryToCSV() {
  if (products.length === 0) {
    showToast("No products to export", "warning");
    return;
  }
  const headers = ["Product Name", "Category", "Unit", "Cost Price", "Selling Price", "Remaining Stock", "Min Stock Alert", "Barcode"];
  const rows = products.map(p => [
    `"${p.name.replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    `"${(p.unit || '').replace(/"/g, '""')}"`,
    p.costPrice,
    p.sellingPrice,
    p.currentStock,
    p.minStock,
    `"${(p.barcode || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  downloadFile(csvContent, `Stock_Inventory_${formatDateForFile(new Date())}.csv`, "text/csv;charset=utf-8;");
  showToast("Inventory exported to CSV!", "success");
}

function exportRestockToCSV() {
  if (restockHistory.length === 0) {
    showToast("No restock records to export", "warning");
    return;
  }
  const headers = ["Date", "Product Name", "Previous Stock", "Incoming Added", "Total Stock After", "Batch Cost Price", "Supplier/Note"];
  const rows = restockHistory.map(r => [
    `"${new Date(r.date).toLocaleString()}"`,
    `"${r.productName.replace(/"/g, '""')}"`,
    r.previousStock,
    r.incomingQty,
    r.totalStock,
    r.costPrice || "",
    `"${(r.supplier || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  downloadFile(csvContent, `Restock_History_${formatDateForFile(new Date())}.csv`, "text/csv;charset=utf-8;");
  showToast("Restock history exported to CSV!", "success");
}

function exportSalesToCSV() {
  if (salesHistory.length === 0) {
    showToast("No sales records to export", "warning");
    return;
  }
  const headers = ["Date", "Product Name", "Qty Sold", "Selling Price", "Total Amount", "Stock Left"];
  const rows = salesHistory.map(s => [
    `"${new Date(s.date).toLocaleString()}"`,
    `"${s.productName.replace(/"/g, '""')}"`,
    s.qtySold,
    s.sellingPrice,
    s.totalAmount,
    s.remainingStock
  ]);
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  downloadFile(csvContent, `Sales_History_${formatDateForFile(new Date())}.csv`, "text/csv;charset=utf-8;");
  showToast("Sales history exported to CSV!", "success");
}

function exportInvoicesToCSV() {
  if (invoices.length === 0) {
    showToast("No invoices to export", "warning");
    return;
  }
  const headers = ["Invoice Number", "Date", "Customer Name", "Customer Phone", "Payment Mode", "Subtotal", "Discount", "Grand Total", "Items Summary"];
  const rows = invoices.map(inv => [
    `"${inv.invoiceNumber}"`,
    `"${new Date(inv.date).toLocaleString()}"`,
    `"${inv.customerName.replace(/"/g, '""')}"`,
    `"${inv.customerPhone || ''}"`,
    `"${inv.paymentMode}"`,
    inv.subtotal,
    inv.discount,
    inv.grandTotal,
    `"${inv.items.map(i => `${i.name} (x${i.qty})`).join("; ").replace(/"/g, '""')}"`
  ]);
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  downloadFile(csvContent, `Invoices_${formatDateForFile(new Date())}.csv`, "text/csv;charset=utf-8;");
  showToast("Invoices exported to CSV!", "success");
}

function downloadJSONBackup() {
  const data = {
    settings,
    products,
    restockHistory,
    salesHistory,
    invoices,
    customers,
    supplierBills,
    udhariEntries,
    exportedAt: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, `General_Store_Backup_${formatDateForFile(new Date())}.json`, "application/json");
  showToast("Store backup file downloaded!", "success");
}

function handleRestoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.products && Array.isArray(parsed.products)) {
        products = parsed.products;
        restockHistory = Array.isArray(parsed.restockHistory) ? parsed.restockHistory : [];
        salesHistory = Array.isArray(parsed.salesHistory) ? parsed.salesHistory : [];
        invoices = Array.isArray(parsed.invoices) ? parsed.invoices : [];
        customers = Array.isArray(parsed.customers) ? parsed.customers : [...INITIAL_CUSTOMERS];
        supplierBills = Array.isArray(parsed.supplierBills) ? parsed.supplierBills : [];
        udhariEntries = Array.isArray(parsed.udhariEntries) ? parsed.udhariEntries : [];
        if (parsed.settings) settings = { ...settings, ...parsed.settings };

        saveData();
        renderAll();
        closeModal("modal-settings");
        showToast("Store data restored successfully!", "success");
      } else {
        showToast("Invalid backup file format", "danger");
      }
    } catch (err) {
      showToast("Error reading file: " + err.message, "danger");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(b => {
    if (b.getAttribute("data-tab") === tabId) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
  document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ================= HELPERS & TOAST =================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTimeLocal(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateForFile(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ================= PWA & APP INSTALL SUPPORT =================
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

function checkCustomerUdhariRequired() {
  const alertBox = document.getElementById("pos-udhari-cust-alert");
  if (!alertBox) return;
  if (selectedPayMode === "Udhari" || selectedPayMode === "Partial") {
    const phone = (document.getElementById("pos-customer-phone")?.value || "").replace(/\D/g, "");
    if (!phone || phone.length < 10) {
      alertBox.style.display = "block";
    } else {
      alertBox.style.display = "none";
    }
  } else {
    alertBox.style.display = "none";
  }
}

window.goToCustomerKhata = function(phone) {
  if (typeof switchTab === "function") {
    switchTab("tab-udhari");
  }
  const searchInput = document.getElementById("ud-search");
  if (searchInput && phone) {
    searchInput.value = phone;
    if (typeof renderUdhari === "function") renderUdhari();
  }
};

window.setPayModeUdhariWithAdvance = function(advanceAmt) {
  const partialBtn = document.querySelector('.pay-btn[data-mode="Partial"]') || document.querySelector('.pay-btn[data-mode="Udhari"]');
  if (partialBtn) {
    partialBtn.click();
  }
  const advInp = document.getElementById("pos-udhari-advance");
  if (advInp) {
    advInp.value = advanceAmt || 0;
  }
  updatePosCalculations();
  showToast(`Baaki amount Customer Udhari khate ke liye set ho gaya!`, "info");
};
