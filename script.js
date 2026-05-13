const API_URL = "https://script.google.com/macros/s/AKfycbw1liweiEEsdNk34TtR4pEH0El5-1UPYSrEb1s0fZGiCK8PXRsNOda5Wxg1ddQuFzHe/exec";

let dashboardData = {};
let salesChart;
let actualTargetChart;
let brandChart;
let trendChart;

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

fetch(API_URL + "?t=" + Date.now())
  .then(res => res.json())
  .then(data => {
    dashboardData = data;

    dashboardData.kpi = cleanRows(data.kpi || []);
    dashboardData.brandTarget = cleanRows(data.brandTarget || []);
    dashboardData.monthlySales = cleanRows(data.monthlySales || []);
    dashboardData.topDealers = cleanRows(data.topDealers || []);
    dashboardData.topDealerPerBrand = cleanRows(data.topDealerPerBrand || []);
    dashboardData.dealerBreakdown = cleanRows(data.dealerBreakdown || []);

    setupTabs();
    setupBurgerMenu();
    populateFilters();
    populateDealerList();
    updateDashboard();

    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
  })
  .catch(error => {
    console.error(error);
    document.getElementById("loading").innerHTML =
      `<p>Failed to load dashboard.<br>${error.message}</p>`;
  });

function cleanRows(rows = []) {
  return rows.filter(row =>
    row["Year"] !== "Year" &&
    row["Month"] !== "Month"
  );
}

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function cleanNumber(value) {
  if (!value) return 0;
  return Number(String(value).replace(/[₱,%\s,]/g, "")) || 0;
}

function formatPeso(value) {
  return "₱" + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function setupTabs() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;

      document.querySelectorAll(".nav-btn").forEach(btn =>
        btn.classList.remove("active")
      );

      document.querySelectorAll(".tab-content").forEach(tab =>
        tab.classList.remove("active")
      );

      button.classList.add("active");
      document.getElementById(tabId).classList.add("active");

      closeMobileMenu();
    });
  });
}

function setupBurgerMenu() {
  document.getElementById("burgerBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("overlay").classList.add("show");
  });

  document.getElementById("overlay").addEventListener("click", closeMobileMenu);
}

function closeMobileMenu() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

function populateFilters() {
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  const years = [...new Set(
    dashboardData.kpi.map(r => r["Year"]).filter(Boolean)
  )].sort();

  yearFilter.innerHTML = `<option value="ALL">All</option>`;
  monthFilter.innerHTML = `<option value="ALL">All</option>`;

  years.forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });

  MONTH_ORDER.forEach(month => {
    monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
  });

  const today = new Date();
  const currentYear = today.getFullYear().toString();
  const currentMonth = MONTH_ORDER[today.getMonth()];

  if (years.map(String).includes(currentYear)) {
    yearFilter.value = currentYear;
  }

  monthFilter.value = currentMonth;

  yearFilter.addEventListener("change", () => {
  document.getElementById("dealerFilter").value = "";
  populateDealerList();
  updateDashboard();
});

monthFilter.addEventListener("change", () => {
  document.getElementById("dealerFilter").value = "";
  populateDealerList();
  updateDashboard();
});
}

function filterRows(rows) {
  const year = String(document.getElementById("yearFilter").value).trim();
  const month = String(document.getElementById("monthFilter").value).trim();

  return rows.filter(row => {
    const rowYear = String(row["Year"] || "").trim();
    const rowMonth = String(row["Month"] || "").trim();

    return (year === "ALL" || rowYear === year) &&
           (month === "ALL" || rowMonth === month);
  });
}

function updateDashboard() {
  const kpiRows = filterRows(dashboardData.kpi);
  const brandRows = filterRows(dashboardData.brandTarget);
  const monthlyRows = filterRows(dashboardData.monthlySales);
  const dealerRows = filterRows(dashboardData.topDealers);
  const topDealerBrandRows = filterRows(dashboardData.topDealerPerBrand);
  const breakdownRows = filterRows(dashboardData.dealerBreakdown);

  updateKPI(kpiRows);
  updateActualVsTarget(brandRows);
  updateBrandTargetTable(brandRows);
  updateMonthlyChart(monthlyRows);
  updateDealers(dealerRows);
  updateTopDealerPerBrand(topDealerBrandRows);
  updateBrandChart(brandRows);
  updateTrendChart(dashboardData.monthlySales);
  updateDealerBreakdown(breakdownRows);
}

function updateKPI(rows) {
  const totalSales = rows.reduce((sum, row) => sum + cleanNumber(row["Total Sales"]), 0);
  const totalOrders = rows.reduce((sum, row) => sum + cleanNumber(row["Total Orders"]), 0);
  const dealerCount = rows.reduce((sum, row) => sum + cleanNumber(row["Dealer Count"]), 0);

  document.getElementById("totalSales").textContent = formatPeso(totalSales);
  document.getElementById("totalOrders").textContent = totalOrders.toLocaleString();
  document.getElementById("dealerCount").textContent = dealerCount.toLocaleString();
}

function updateActualVsTarget(rows) {
  const labels = rows.map(r => r["Brand"]);
  const actual = rows.map(r => cleanNumber(r["Actual"]));
  const target = rows.map(r => cleanNumber(r["Target"]));

  if (actualTargetChart) actualTargetChart.destroy();

  actualTargetChart = new Chart(document.getElementById("actualTargetChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Actual", data: actual },
        { label: "Target", data: target, type: "line" }
      ]
    },
    options: chartOptions()
  });
}

function updateBrandTargetTable(rows) {
  let totalTarget = 0;
  let totalActual = 0;
  let totalBalance = 0;
  let totalCommission = 0;

  const html = rows.map(row => {
    const target = cleanNumber(row["Target"]);
    const actual = cleanNumber(row["Actual"]);
    const balance = cleanNumber(row["Balance"]);
    const commission = cleanNumber(row["Commission"]);
    const percent = target > 0 ? Math.round((actual / target) * 100) + "%" : "-";

    totalTarget += target;
    totalActual += actual;
    totalBalance += balance;
    totalCommission += commission;

    return `
      <tr>
        <td>${row["Brand"] || ""}</td>
        <td>${formatPeso(target)}</td>
        <td>${actual ? formatPeso(actual) : "-"}</td>
        <td>${balance ? formatPeso(balance) : "-"}</td>
        <td>${percent}</td>
        <td>${commission ? formatPeso(commission) : "-"}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("brandTargetTable").innerHTML = html + `
    <tr class="total-row">
      <td>TOTAL</td>
      <td>${formatPeso(totalTarget)}</td>
      <td>${formatPeso(totalActual)}</td>
      <td>${formatPeso(totalBalance)}</td>
      <td></td>
      <td>${formatPeso(totalCommission)}</td>
    </tr>
  `;
}

function updateMonthlyChart(rows) {
  const summary = {};

  rows.forEach(row => {
    const month = row["Month"];
    summary[month] = (summary[month] || 0) + cleanNumber(row["Total Sales"]);
  });

  if (salesChart) salesChart.destroy();

  salesChart = new Chart(document.getElementById("salesChart"), {
    type: "bar",
    data: {
      labels: Object.keys(summary),
      datasets: [{
        label: "Monthly Sales",
        data: Object.values(summary)
      }]
    },
    options: chartOptions()
  });
}

function updateDealers(rows) {
  const topDealers = rows
    .sort((a, b) => cleanNumber(b["Total Sales"]) - cleanNumber(a["Total Sales"]))
    .slice(0, 10);

  document.getElementById("dealerTable").innerHTML = topDealers.map(row => `
    <tr>
      <td>${row["Dealer"] || ""}</td>
      <td>${formatPeso(row["Total Sales"])}</td>
    </tr>
  `).join("");
}

function updateTopDealerPerBrand(rows) {
  const brandBest = {};

  rows.forEach(row => {
    const brand = row["Brand"];
    const sales = cleanNumber(row["Total Sales"]);

    if (!brandBest[brand] || sales > cleanNumber(brandBest[brand]["Total Sales"])) {
      brandBest[brand] = row;
    }
  });

  const html = Object.values(brandBest)
    .sort((a, b) => String(a["Brand"]).localeCompare(String(b["Brand"])))
    .map(row => `
      <tr>
        <td>${row["Brand"] || ""}</td>
        <td>${row["Dealer"] || ""}</td>
        <td>${formatPeso(row["Total Sales"])}</td>
      </tr>
    `).join("");

  document.getElementById("topDealerPerBrandTable").innerHTML = html;
}

function populateDealerList() {
  const datalist = document.getElementById("dealerList");
  const rows = filterRows(dashboardData.dealerBreakdown || []);

  const dealers = [...new Set(
    rows.map(r => getValue(r, ["Dealer", "DEALER", "Dealer Name", "DEALER'S NAME"])).filter(Boolean)
  )].sort();

  datalist.innerHTML = dealers.map(dealer =>
    `<option value="${dealer}"></option>`
  ).join("");

  const dealerFilter = document.getElementById("dealerFilter");
  dealerFilter.oninput = () => {
    updateDealerBreakdown(filterRows(dashboardData.dealerBreakdown || []));
  };
}

function updateDealerBreakdown(rows) {
  const searchValue = String(document.getElementById("dealerFilter").value || "")
    .toLowerCase()
    .trim();

  const filtered = rows.filter(row => {
    const dealer = String(getValue(row, ["Dealer", "DEALER", "Dealer Name", "DEALER'S NAME"])).toLowerCase();
    const brand = String(getValue(row, ["Brand", "BRAND"])).toLowerCase();
    const order = String(getValue(row, ["Order", "ORDER"])).toLowerCase();

    if (!searchValue) return true;

    return dealer.includes(searchValue) ||
           brand.includes(searchValue) ||
           order.includes(searchValue);
  });

  const tbody = document.getElementById("dealerBreakdownTable");
  const cardContainer = document.getElementById("dealerBreakdownCards");

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No dealer breakdown data received for this selected Year/Month.</td>
      </tr>
    `;

    if (cardContainer) {
      cardContainer.innerHTML = `
        <div class="dealer-mobile-card">No dealer breakdown data received for this selected Year/Month.</div>
      `;
    }

    return;
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No matching dealer, brand, or order found.</td>
      </tr>
    `;

    if (cardContainer) {
      cardContainer.innerHTML = `
        <div class="dealer-mobile-card">No matching dealer, brand, or order found.</div>
      `;
    }

    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const dealer = getValue(row, ["Dealer", "DEALER", "Dealer Name", "DEALER'S NAME"]);
    const brand = getValue(row, ["Brand", "BRAND"]);
    const order = getValue(row, ["Order", "ORDER"]);
    const qty = getValue(row, ["Total Qty", "TOTAL QTY", "Qty", "QTY"]);
    const sales = getValue(row, ["Total Sales", "TOTAL SALES", "Sales", "TOTAL"]);

    return `
      <tr>
        <td>${dealer}</td>
        <td>${brand}</td>
        <td>${order}</td>
        <td>${cleanNumber(qty).toLocaleString()}</td>
        <td>${formatPeso(sales)}</td>
      </tr>
    `;
  }).join("");

  if (cardContainer) {
    cardContainer.innerHTML = filtered.map(row => {
      const dealer = getValue(row, ["Dealer", "DEALER", "Dealer Name", "DEALER'S NAME"]);
      const brand = getValue(row, ["Brand", "BRAND"]);
      const order = getValue(row, ["Order", "ORDER"]);
      const qty = getValue(row, ["Total Qty", "TOTAL QTY", "Qty", "QTY"]);
      const sales = getValue(row, ["Total Sales", "TOTAL SALES", "Sales", "TOTAL"]);

      return `
        <div class="dealer-mobile-card">
          <div><strong>Dealer:</strong> ${dealer}</div>
          <div><strong>Brand:</strong> ${brand}</div>
          <div><strong>Order:</strong> ${order}</div>
          <div><strong>Qty:</strong> ${cleanNumber(qty).toLocaleString()}</div>
          <div><strong>Sales:</strong> ${formatPeso(sales)}</div>
        </div>
      `;
    }).join("");
  }
}

function updateBrandChart(rows) {
  const labels = rows.map(r => r["Brand"]);
  const values = rows.map(r => cleanNumber(r["Actual"]));

  if (brandChart) brandChart.destroy();

  brandChart = new Chart(document.getElementById("brandChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Brand Sales",
        data: values
      }]
    },
    options: chartOptions()
  });
}

function updateTrendChart(rows) {
  const selectedYear = document.getElementById("yearFilter").value;
  const yearRows = rows.filter(row =>
    selectedYear === "ALL" || row["Year"] == selectedYear
  );

  const summary = {};

  MONTH_ORDER.forEach(month => {
    summary[month] = 0;
  });

  yearRows.forEach(row => {
    const month = row["Month"];
    summary[month] = (summary[month] || 0) + cleanNumber(row["Total Sales"]);
  });

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: MONTH_ORDER,
      datasets: [{
        label: "Sales Trend",
        data: MONTH_ORDER.map(month => summary[month])
      }]
    },
    options: chartOptions()
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "white"
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "white"
        }
      },
      y: {
        ticks: {
          color: "white"
        }
      }
    }
  };
}
