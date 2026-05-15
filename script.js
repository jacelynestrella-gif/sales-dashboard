let dashboardData = { raw: [], kpi: [], brandTarget: [], monthlySales: [], topDealers: [], topDealerPerBrand: [], dealerBreakdown: [] };
let actualTargetChart;
let brandChart;
let trendChart;
let weeklySalesCharts = [];
let supabaseClient;

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

initDashboard();

async function initDashboard() {
  try {
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Supabase config not loaded.");
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    await loadSupabaseData();

    safeRun(setupTabs, "setupTabs");
    safeRun(setupBurgerMenu, "setupBurgerMenu");
    safeRun(populateFilters, "populateFilters");
    safeRun(populateDealerList, "populateDealerList");
    safeRun(updateDashboard, "updateDashboard");

    showDashboard();
  } catch (error) {
    console.error("Dashboard load error:", error);
    const loading = document.getElementById("loading");
    if (loading) loading.innerHTML = `<p>Failed to load dashboard.<br>${error.message}</p>`;
  }
}

async function loadSupabaseData() {
  const { data, error } = await supabaseClient
    .from("raw_sales")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;

  dashboardData.raw = mapSupabaseRows(data || []);
  rebuildDashboardTables();
}

function mapSupabaseRows(rows) {
  return rows.map(row => ({
    id: row.id,
    CONTROL_NO: row.control_no || "",
    DATE: row.sale_date || "",
    "SO#": row.so_no || "",
    "DEALER'S NAME": row.dealer_name || "",
    BRAND: row.brand || "",
    ORDER: row.order_name || "",
    QTY: Number(row.qty || 0),
    PRICE: Number(row.price || 0),
    DISCOUNT: Number(row.discount || 0),
    "DISCOUNTED PRICE": Number(row.discounted_price || 0),
    TOTAL: Number(row.total || 0),
    "CLIENT TOTAL AMOUNT": Number(row.client_total_amount || 0),
    "DOC. PROCESSED": row.doc_processed || "",
    "SALES AGENT": row.sales_agent || "",
    "CM STATUS": row.cm_status || "",
    STATUS: row.status || "",
    "CONCERN/PROMO": row.concern_promo || "",
    NOTES: row.notes || "",
    Month: row.month || getMonthFromSaleDate(row.sale_date),
    Year: row.year || getYearFromSaleDate(row.sale_date)
  }));
}

function rebuildDashboardTables() {
  dashboardData.dealerBreakdown = buildDealerBreakdownRows(dashboardData.raw);
  dashboardData.topDealers = buildTopDealersRows(dashboardData.raw);
  dashboardData.topDealerPerBrand = buildTopDealerPerBrandRows(dashboardData.raw);
  dashboardData.brandTarget = buildBrandRows(dashboardData.raw);
  dashboardData.monthlySales = buildMonthlyRows(dashboardData.raw);
  dashboardData.kpi = buildKpiRows(dashboardData.raw);
}

function getMonthFromSaleDate(value) {
  const date = parseDateValue(value);
  return date ? MONTH_ORDER[date.getMonth()] : "";
}

function getYearFromSaleDate(value) {
  const date = parseDateValue(value);
  return date ? date.getFullYear() : "";
}

function groupKey(parts) {
  return parts.map(part => String(part || "").trim()).join("||");
}

function buildDealerBreakdownRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const dealer = getDealerValue(row) || "NO DEALER";
    const brand = row.BRAND || "NO BRAND";
    const order = row.ORDER || "NO ITEM";
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([dealer, brand, order, month, year]);
    const current = map.get(key) || { Dealer: dealer, Brand: brand, Order: order, Month: month, Year: year, "Total Qty": 0, "Total Sales": 0 };
    current["Total Qty"] += cleanNumber(row.QTY);
    current["Total Sales"] += cleanNumber(row.TOTAL || row["CLIENT TOTAL AMOUNT"]);
    map.set(key, current);
  });
  return [...map.values()];
}

function buildTopDealersRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const dealer = getDealerValue(row) || "NO DEALER";
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([dealer, month, year]);
    const current = map.get(key) || { Dealer: dealer, Month: month, Year: year, "Total Sales": 0 };
    current["Total Sales"] += cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL);
    map.set(key, current);
  });
  return [...map.values()];
}

function buildTopDealerPerBrandRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const dealer = getDealerValue(row) || "NO DEALER";
    const brand = row.BRAND || "NO BRAND";
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([brand, dealer, month, year]);
    const current = map.get(key) || { Brand: brand, Dealer: dealer, Month: month, Year: year, "Total Sales": 0 };
    current["Total Sales"] += cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL);
    map.set(key, current);
  });
  return [...map.values()];
}

function buildBrandRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const brand = row.BRAND || "NO BRAND";
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([brand, month, year]);
    const current = map.get(key) || { Brand: brand, Month: month, Year: year, Target: 0, Actual: 0, Balance: 0, Commission: 0 };
    current.Actual += cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL);
    map.set(key, current);
  });
  return [...map.values()].map(row => ({ ...row, Balance: cleanNumber(row.Target) - cleanNumber(row.Actual) }));
}

function buildMonthlyRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([month, year]);
    const current = map.get(key) || { Month: month, Year: year, "Total Sales": 0 };
    current["Total Sales"] += cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL);
    map.set(key, current);
  });
  return [...map.values()];
}

function buildKpiRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    const month = row.Month || getRowMonth(row);
    const year = row.Year || getRowYear(row);
    const key = groupKey([month, year]);
    const current = map.get(key) || { Month: month, Year: year, "Total Sales": 0, "Total Orders": 0 };
    current["Total Sales"] += cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL);
    current["Total Orders"] += 1;
    map.set(key, current);
  });
  return [...map.values()];
}

function safeRun(fn, label) {
  try { fn(); } catch (error) { console.error(label + " error:", error); }
}

function showDashboard() {
  const loading = document.getElementById("loading");
  const dashboard = document.getElementById("dashboard");
  if (loading) loading.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
}

function cleanRows(rows = []) { return rows.filter(Boolean); }

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function getDealerValue(row) {
  return String(getValue(row, ["Dealer", "DEALER", "Dealer Name", "DEALER NAME", "Dealer's Name", "DEALER'S NAME", "Account Name", "ACCOUNT NAME", "Customer", "CUSTOMER", "Customer Name", "CUSTOMER NAME", "dealer_name"])).trim();
}

function cleanNumber(value) {
  if (!value) return 0;
  return Number(String(value).replace(/[₱,%\s,]/g, "")) || 0;
}

function formatPeso(value) {
  return "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setupTabs() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;
      document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(tabId)?.classList.add("active");
      closeMobileMenu();
      if (tabId === "tabRawData" && typeof renderRawDataTable === "function") setTimeout(renderRawDataTable, 50);
      setTimeout(() => {
        if (actualTargetChart) actualTargetChart.resize();
        if (brandChart) brandChart.resize();
        if (trendChart) trendChart.resize();
      }, 100);
    });
  });
}

function setupBurgerMenu() {
  const burger = document.getElementById("burgerBtn");
  const overlay = document.getElementById("overlay");
  if (!burger || !overlay) return;
  burger.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.add("open");
    overlay.classList.add("show");
  });
  overlay.addEventListener("click", closeMobileMenu);
}

function closeMobileMenu() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}

function populateFilters() {
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");
  if (!yearFilter || !monthFilter) return;

  const years = [...new Set(dashboardData.raw.map(r => r.Year).filter(Boolean).map(String))].sort();
  yearFilter.innerHTML = `<option value="ALL">All</option>`;
  monthFilter.innerHTML = `<option value="ALL">All</option>`;
  years.forEach(year => yearFilter.innerHTML += `<option value="${year}">${year}</option>`);
  MONTH_ORDER.forEach(month => monthFilter.innerHTML += `<option value="${month}">${month}</option>`);

  const today = new Date();
  const currentYear = String(today.getFullYear());
  const currentMonth = MONTH_ORDER[today.getMonth()];
  if (years.includes(currentYear)) yearFilter.value = currentYear;
  monthFilter.value = currentMonth;

  yearFilter.addEventListener("change", handleFilterChange);
  monthFilter.addEventListener("change", handleFilterChange);
}

function handleFilterChange() {
  const dealerFilter = document.getElementById("dealerFilter");
  if (dealerFilter) dealerFilter.value = "";
  safeRun(populateDealerList, "populateDealerList");
  safeRun(updateDashboard, "updateDashboard");
  if (typeof renderRawDataTable === "function") { rawCurrentPage = 1; renderRawDataTable(); }
}

function filterRows(rows) {
  const year = String(document.getElementById("yearFilter")?.value || "ALL").trim();
  const month = String(document.getElementById("monthFilter")?.value || "ALL").trim();
  return rows.filter(row => {
    const rowYear = String(getRowYear(row) || "").trim();
    const rowMonth = String(getRowMonth(row) || "").trim();
    return (year === "ALL" || rowYear === year) && (month === "ALL" || rowMonth === month);
  });
}

function getRowYear(row) {
  const directYear = getValue(row, ["Year", "YEAR", "year"]);
  if (directYear) return directYear;
  const date = getDateFromRow(row);
  return date ? date.getFullYear() : "";
}

function getRowMonth(row) {
  const directMonth = getValue(row, ["Month", "MONTH", "month"]);
  if (directMonth) return directMonth;
  const date = getDateFromRow(row);
  return date ? MONTH_ORDER[date.getMonth()] : "";
}

function updateDashboard() {
  rebuildDashboardTables();
  const kpiRows = filterRows(dashboardData.kpi || []);
  const brandRows = filterRows(dashboardData.brandTarget || []);
  const dealerRows = filterRows(dashboardData.topDealers || []);
  const topDealerBrandRows = filterRows(dashboardData.topDealerPerBrand || []);
  const breakdownRows = filterRows(dashboardData.dealerBreakdown || []);
  const rawRows = dashboardData.raw || [];

  safeRun(() => updateKPI(kpiRows, breakdownRows, dealerRows), "updateKPI");
  safeRun(() => updateActualVsTarget(brandRows), "updateActualVsTarget");
  safeRun(() => updateBrandTargetTable(brandRows), "updateBrandTargetTable");
  safeRun(() => updateDailySalesByWeek(rawRows), "updateDailySalesByWeek");
  safeRun(() => updateDealers(dealerRows), "updateDealers");
  safeRun(() => updateTopDealerPerBrand(topDealerBrandRows), "updateTopDealerPerBrand");
  safeRun(() => updateBrandChart(brandRows), "updateBrandChart");
  safeRun(() => updateTrendChart(dashboardData.monthlySales || []), "updateTrendChart");
  safeRun(() => updateDealerBreakdown(breakdownRows), "updateDealerBreakdown");
  safeRun(() => updateBrandItems(breakdownRows), "updateBrandItems");
}

function updateKPI(rows, breakdownRows = [], dealerRows = []) {
  const uniqueDealers = new Set();
  const filteredRaw = filterRows(dashboardData.raw || []);
  filteredRaw.forEach(row => {
    const dealer = getDealerValue(row);
    if (dealer) uniqueDealers.add(dealer.toUpperCase());
  });
  document.getElementById("totalSales").textContent = formatPeso(filteredRaw.reduce((sum, row) => sum + cleanNumber(row["CLIENT TOTAL AMOUNT"] || row.TOTAL), 0));
  document.getElementById("totalOrders").textContent = filteredRaw.length.toLocaleString();
  document.getElementById("dealerCount").textContent = uniqueDealers.size.toLocaleString();
}

function chartOptions() {
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "white" } } }, scales: { x: { ticks: { color: "white" } }, y: { ticks: { color: "white" } } } };
}

function canUseCharts() { return typeof Chart !== "undefined"; }

function getDateFromRow(row) {
  const dateValue = getValue(row, ["Date", "DATE", "sale_date", "Order Date", "ORDER DATE", "Sales Date", "SALES DATE"]);
  if (dateValue) {
    const parsed = parseDateValue(dateValue);
    if (parsed) return parsed;
  }
  return null;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "number") {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(excelDate) ? null : excelDate;
  }
  const text = String(value).trim();
  const parsed = new Date(text);
  if (!isNaN(parsed)) return parsed;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    const month = Number(match[1]) - 1;
    const day = Number(match[2]);
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const date = new Date(year, month, day);
    return isNaN(date) ? null : date;
  }
  return null;
}

function updateDailySalesByWeek(rows) {}

function updateActualVsTarget(rows) {
  const el = document.getElementById("actualTargetChart");
  if (!el || !canUseCharts()) return;
  if (actualTargetChart) actualTargetChart.destroy();
  actualTargetChart = new Chart(el, { type: "bar", data: { labels: rows.map(r => r.Brand), datasets: [{ label: "Actual", data: rows.map(r => cleanNumber(r.Actual)) }] }, options: chartOptions() });
}

function updateBrandChart(rows) {
  const el = document.getElementById("brandChart");
  if (!el || !canUseCharts()) return;
  if (brandChart) brandChart.destroy();
  brandChart = new Chart(el, { type: "bar", data: { labels: rows.map(r => r.Brand), datasets: [{ label: "Brand Sales", data: rows.map(r => cleanNumber(r.Actual)) }] }, options: chartOptions() });
}

function updateTrendChart(rows) {
  const el = document.getElementById("trendChart");
  if (!el || !canUseCharts()) return;
  const selectedYear = document.getElementById("yearFilter")?.value || "ALL";
  const yearRows = rows.filter(row => selectedYear === "ALL" || String(row.Year) === String(selectedYear));
  const summary = {};
  MONTH_ORDER.forEach(month => summary[month] = 0);
  yearRows.forEach(row => summary[row.Month] = (summary[row.Month] || 0) + cleanNumber(row["Total Sales"]));
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(el, { type: "line", data: { labels: MONTH_ORDER, datasets: [{ label: "Sales Trend", data: MONTH_ORDER.map(month => summary[month]) }] }, options: chartOptions() });
}

function updateBrandTargetTable(rows) {
  const el = document.getElementById("brandTargetTable");
  if (!el) return;
  let totalActual = 0;
  const html = rows.map(row => {
    const actual = cleanNumber(row.Actual);
    totalActual += actual;
    return `<tr><td>${row.Brand || ""}</td><td>-</td><td>${actual ? formatPeso(actual) : "-"}</td><td>-</td><td>-</td><td>-</td></tr>`;
  }).join("");
  el.innerHTML = html + `<tr class="total-row"><td>TOTAL</td><td>-</td><td>${formatPeso(totalActual)}</td><td>-</td><td></td><td>-</td></tr>`;
}

function updateDealers(rows) {
  const el = document.getElementById("dealerTable");
  if (!el) return;
  const sorted = [...rows].sort((a, b) => cleanNumber(b["Total Sales"]) - cleanNumber(a["Total Sales"]));
  el.innerHTML = sorted.map((row, index) => `<tr class="${index < 10 ? "top10-row" : ""}"><td>${index < 10 ? `<span class="rank-badge">#${index + 1}</span>` : `<span class="rank-placeholder"></span>`}${row.Dealer || ""}</td><td>${formatPeso(row["Total Sales"])}</td></tr>`).join("");
}

function updateTopDealerPerBrand(rows) {
  const el = document.getElementById("topDealerPerBrandTable");
  if (!el) return;
  const brandBest = {};
  rows.forEach(row => {
    const brand = row.Brand;
    const sales = cleanNumber(row["Total Sales"]);
    if (!brandBest[brand] || sales > cleanNumber(brandBest[brand]["Total Sales"])) brandBest[brand] = row;
  });
  el.innerHTML = Object.values(brandBest).sort((a, b) => String(a.Brand).localeCompare(String(b.Brand))).map(row => `<tr><td>${row.Brand || ""}</td><td>${row.Dealer || ""}</td><td>${formatPeso(row["Total Sales"])}</td></tr>`).join("");
}

function populateDealerList() {
  const datalist = document.getElementById("dealerList");
  if (!datalist) return;
  const rows = filterRows(dashboardData.dealerBreakdown || []);
  const dealers = [...new Set(rows.map(r => getDealerValue(r)).filter(Boolean))].sort();
  datalist.innerHTML = dealers.map(dealer => `<option value="${dealer}"></option>`).join("");
  const dealerFilter = document.getElementById("dealerFilter");
  if (dealerFilter) dealerFilter.oninput = () => updateDealerBreakdown(filterRows(dashboardData.dealerBreakdown || []));
}

function updateDealerBreakdown(rows) {
  const container = document.getElementById("dealerBreakdownAccordion");
  if (!container) return;
  const searchValue = String(document.getElementById("dealerFilter")?.value || "").toLowerCase().trim();
  const filtered = rows.filter(row => {
    const dealer = String(getDealerValue(row)).toLowerCase();
    const brand = String(row.Brand || "").toLowerCase();
    const item = String(row.Order || "").toLowerCase();
    return !searchValue || dealer.includes(searchValue) || brand.includes(searchValue) || item.includes(searchValue);
  });
  if (!rows.length) return container.innerHTML = `<div class="empty-card">No dealer breakdown data found for this selected Year/Month.</div>`;
  if (!filtered.length) return container.innerHTML = `<div class="empty-card">No matching dealer, brand, or item found.</div>`;

  const grouped = {};
  filtered.forEach(row => {
    const dealer = row.Dealer || "NO DEALER";
    const brand = row.Brand || "NO BRAND";
    const item = row.Order || "NO ITEM";
    const qty = cleanNumber(row["Total Qty"]);
    const sales = cleanNumber(row["Total Sales"]);
    if (!grouped[dealer]) grouped[dealer] = { qty: 0, sales: 0, brands: new Set(), items: [] };
    grouped[dealer].qty += qty;
    grouped[dealer].sales += sales;
    grouped[dealer].brands.add(brand);
    grouped[dealer].items.push({ brand, item, qty, sales });
  });

  container.innerHTML = Object.entries(grouped).sort((a, b) => b[1].sales - a[1].sales).map(([dealer, data], index) => {
    const items = data.items.sort((a, b) => b.sales - a.sales);
    return `<details class="brand-accordion dealer-compact" ${index === 0 ? "open" : ""}>
      <summary class="brand-accordion-header dealer-compact-header"><span class="brand-title dealer-title">${dealer}</span><span class="brand-summary">${data.brands.size} brand(s)</span><span class="brand-summary">${items.length} item(s)</span><span class="brand-summary">Qty: ${data.qty.toLocaleString()}</span><span class="brand-summary total-chip">${formatPeso(data.sales)}</span></summary>
      <div class="brand-accordion-body dealer-compact-body"><table><thead><tr><th>Brand</th><th>Item</th><th>Qty</th><th>Total Sales</th></tr></thead><tbody>${items.map(row => `<tr><td>${row.brand}</td><td>${row.item}</td><td>${row.qty.toLocaleString()}</td><td>${formatPeso(row.sales)}</td></tr>`).join("")}</tbody></table></div>
    </details>`;
  }).join("");
}

function updateBrandItems(rows) {
  const container = document.getElementById("brandItemsAccordion");
  if (!container) return;
  if (!rows.length) return container.innerHTML = `<div class="empty-card">No brand item data found for this selected Year/Month.</div>`;
  const grouped = {};
  rows.forEach(row => {
    const brand = row.Brand || "NO BRAND";
    const item = row.Order || "NO ITEM";
    const qty = cleanNumber(row["Total Qty"]);
    const sales = cleanNumber(row["Total Sales"]);
    const dealer = row.Dealer;
    if (!grouped[brand]) grouped[brand] = { qty: 0, sales: 0, dealers: new Set(), items: {} };
    if (!grouped[brand].items[item]) grouped[brand].items[item] = { qty: 0, sales: 0, dealers: new Set() };
    grouped[brand].qty += qty; grouped[brand].sales += sales;
    if (dealer) grouped[brand].dealers.add(dealer);
    grouped[brand].items[item].qty += qty; grouped[brand].items[item].sales += sales;
    if (dealer) grouped[brand].items[item].dealers.add(dealer);
  });
  container.innerHTML = Object.entries(grouped).sort((a, b) => b[1].sales - a[1].sales).map(([brand, data], index) => {
    const items = Object.entries(data.items).sort((a, b) => b[1].sales - a[1].sales);
    return `<details class="brand-accordion" ${index === 0 ? "open" : ""}><summary class="brand-accordion-header"><span class="brand-title">${brand}</span><span class="brand-summary">${items.length} item(s)</span><span class="brand-summary">Qty: ${data.qty.toLocaleString()}</span><span class="brand-summary">${formatPeso(data.sales)}</span><span class="brand-summary">Dealers: ${data.dealers.size}</span></summary><div class="brand-accordion-body"><table><thead><tr><th>Item</th><th>Qty</th><th>Total Sales</th><th>Dealers</th></tr></thead><tbody>${items.map(([item, itemData]) => `<tr><td>${item}</td><td>${itemData.qty.toLocaleString()}</td><td>${formatPeso(itemData.sales)}</td><td>${itemData.dealers.size}</td></tr>`).join("")}</tbody></table></div></details>`;
  }).join("");
}
