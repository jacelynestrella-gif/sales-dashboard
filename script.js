const API_URL = "https://script.google.com/macros/s/AKfycbyF44l5i6C-kqwiFDIXlfmgXVCfHiastoiy9VdniI0VAqm0tgtBcC8eeBbOT-nvqDQ_/exec";

let dashboardData = {};
let salesChart;
let actualTargetChart;

fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    dashboardData = data;

    populateFilters();
    updateDashboard();

    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
  })
  .catch(error => {
    console.error("Error loading data:", error);
    document.getElementById("loading").innerHTML = "<p>Failed to load dashboard.</p>";
  });

function cleanNumber(value) {
  if (!value) return 0;

  return Number(
    String(value)
      .replace(/₱/g, "")
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim()
  ) || 0;
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

  const years = [...new Set((dashboardData.filters || []).map(r => r["Years"]).filter(Boolean))];
  const months = [...new Set((dashboardData.filters || []).map(r => r["Months"]).filter(Boolean))];

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
  const selectedYear = document.getElementById("yearFilter").value;
  const selectedMonth = document.getElementById("monthFilter").value;

  return rows.filter(row => {
    const yearMatch = selectedYear === "ALL" || row["Year"] == selectedYear;
    const monthMatch = selectedMonth === "ALL" || row["Month"] == selectedMonth;

    return yearMatch && monthMatch;
  });
}

function updateDashboard() {
  const kpiRows = filterRows(dashboardData.kpi || []);
  const brandRows = filterRows(dashboardData.brandTarget || []);
  const dealerRows = filterRows(dashboardData.topDealers || []);
  const monthlyRows = filterRows(dashboardData.monthlySales || []);

  updateKPI(kpiRows);
  updateActualVsTarget(brandRows);
  updateBrandTargetTable(brandRows);
  updateMonthlyChart(monthlyRows);
  updateDealers(dealerRows);
}

function updateKPI(rows) {
  const totalSales = rows.reduce((sum, row) => {
    return sum + cleanNumber(row["Total Sales"]);
  }, 0);

  const totalOrders = rows.reduce((sum, row) => {
    return sum + cleanNumber(row["Total Orders"]);
  }, 0);

  const dealerCount = rows.reduce((sum, row) => {
    return sum + cleanNumber(row["Dealer Count"]);
  }, 0);

  document.getElementById("totalSales").textContent = formatPeso(totalSales);
  document.getElementById("totalOrders").textContent = totalOrders.toLocaleString();
  document.getElementById("dealerCount").textContent = dealerCount.toLocaleString();
}

function updateActualVsTarget(rows) {
  const summary = {};

  rows.forEach(row => {
    const brand = row["Brand"] || "Unknown";

    if (!summary[brand]) {
      summary[brand] = {
        actual: 0,
        target: 0
      };
    }

    summary[brand].actual += cleanNumber(row["Actual"]);
    summary[brand].target += cleanNumber(row["Target"]);
  });

  const labels = Object.keys(summary);
  const actualValues = labels.map(brand => summary[brand].actual);
  const targetValues = labels.map(brand => summary[brand].target);

  if (actualTargetChart) {
    actualTargetChart.destroy();
  }

  actualTargetChart = new Chart(document.getElementById("actualTargetChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Actual",
          data: actualValues
        },
        {
          label: "Target",
          data: targetValues,
          type: "line"
        }
      ]
    },
    options: {
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
    }
  });
}

function updateBrandTargetTable(rows) {
  const summary = {};

  rows.forEach(row => {
    const brand = row["Brand"] || "Unknown";

    if (!summary[brand]) {
      summary[brand] = {
        target: 0,
        actual: 0,
        balance: 0,
        commission: 0
      };
    }

    summary[brand].target += cleanNumber(row["Target"]);
    summary[brand].actual += cleanNumber(row["Actual"]);
    summary[brand].balance += cleanNumber(row["Balance"]);
    summary[brand].commission += cleanNumber(row["Commission"]);
  });

  let totalTarget = 0;
  let totalActual = 0;
  let totalBalance = 0;
  let totalCommission = 0;

  const tableRows = Object.entries(summary).map(([brand, item]) => {
    const percentage = item.target > 0 ? item.actual / item.target : 0;

    totalTarget += item.target;
    totalActual += item.actual;
    totalBalance += item.balance;
    totalCommission += item.commission;

    return `
      <tr>
        <td>${brand}</td>
        <td>${formatPeso(item.target)}</td>
        <td>${item.actual ? formatPeso(item.actual) : "-"}</td>
        <td>${item.balance ? formatPeso(item.balance) : "-"}</td>
        <td>${percentage ? Math.round(percentage * 100) + "%" : "-"}</td>
        <td>${item.commission ? formatPeso(item.commission) : "-"}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("brandTargetTable").innerHTML = tableRows + `
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
  const monthlySales = {};

  rows.forEach(row => {
    const month = row["Month"] || "Unknown";
    monthlySales[month] = (monthlySales[month] || 0) + cleanNumber(row["Total Sales"]);
  });

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(document.getElementById("salesChart"), {
    type: "bar",
    data: {
      labels: Object.keys(monthlySales),
      datasets: [{
        label: "Monthly Sales",
        data: Object.values(monthlySales)
      }]
    },
    options: {
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
    }
  });
}

function updateDealers(rows) {
  const dealerSales = {};

  rows.forEach(row => {
    const dealer = row["Dealer"] || "Unknown";
    dealerSales[dealer] = (dealerSales[dealer] || 0) + cleanNumber(row["Total Sales"]);
  });

  const topDealers = Object.entries(dealerSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  document.getElementById("dealerTable").innerHTML =
    topDealers.map(([dealer, total]) => `
      <tr>
        <td>${dealer}</td>
        <td>${formatPeso(total)}</td>
      </tr>
    `).join("");
}
