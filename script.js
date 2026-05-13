const API_URL = "https://script.google.com/macros/s/AKfycbw1liweiEEsdNk34TtR4pEH0El5-1UPYSrEb1s0fZGiCK8PXRsNOda5Wxg1ddQuFzHe/exec";

let dashboardData = {};
let salesChart;
let actualTargetChart;

fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    dashboardData = data;

    dashboardData.kpi = cleanRows(data.kpi);
    dashboardData.brandTarget = cleanRows(data.brandTarget);
    dashboardData.topDealers = cleanRows(data.topDealers);
    dashboardData.monthlySales = cleanRows(data.monthlySales);
    dashboardData.filters = cleanRows(data.filters);

    populateFilters();
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
  return rows.filter(row => {
    return row["Year"] !== "Year" &&
           row["Month"] !== "Month" &&
           row["Brand"] !== "Brand" &&
           row["Dealer"] !== "Dealer";
  });
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

function populateFilters() {
  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  const years = [...new Set(dashboardData.kpi.map(r => r["Year"]).filter(Boolean))].sort();
  const months = [...new Set(dashboardData.kpi.map(r => r["Month"]).filter(Boolean))];

  years.forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });

  months.forEach(month => {
    monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
  });

  yearFilter.addEventListener("change", updateDashboard);
  monthFilter.addEventListener("change", updateDashboard);
}

function filterRows(rows) {
  const year = document.getElementById("yearFilter").value;
  const month = document.getElementById("monthFilter").value;

  return rows.filter(row => {
    return (year === "ALL" || row["Year"] == year) &&
           (month === "ALL" || row["Month"] == month);
  });
}

function updateDashboard() {
  const kpiRows = filterRows(dashboardData.kpi);
  const brandRows = filterRows(dashboardData.brandTarget);
  const dealerRows = filterRows(dashboardData.topDealers);
  const monthlyRows = filterRows(dashboardData.monthlySales);

  updateKPI(kpiRows);
  updateActualVsTarget(brandRows);
  updateBrandTargetTable(brandRows);
  updateMonthlyChart(monthlyRows);
  updateDealers(dealerRows);
}

function updateKPI(rows) {
  const totalSales = rows.reduce((s, r) => s + cleanNumber(r["Total Sales"]), 0);
  const totalOrders = rows.reduce((s, r) => s + cleanNumber(r["Total Orders"]), 0);
  const dealerCount = rows.reduce((s, r) => s + cleanNumber(r["Dealer Count"]), 0);

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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      }
    }
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
    const percent = target ? Math.round((actual / target) * 100) + "%" : "-";

    totalTarget += target;
    totalActual += actual;
    totalBalance += balance;
    totalCommission += commission;

    return `
      <tr>
        <td>${row["Brand"]}</td>
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
      datasets: [{ label: "Monthly Sales", data: Object.values(summary) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      }
    }
  });
}

function updateDealers(rows) {
  const topDealers = rows
    .sort((a, b) => cleanNumber(b["Total Sales"]) - cleanNumber(a["Total Sales"]))
    .slice(0, 10);

  document.getElementById("dealerTable").innerHTML = topDealers.map(row => `
    <tr>
      <td>${row["Dealer"]}</td>
      <td>${formatPeso(row["Total Sales"])}</td>
    </tr>
  `).join("");
}
