const API_URL = "https://script.google.com/macros/s/AKfycbysJCe4fN6kn9GNHC8kNZiwerQo5ffvIlmHWd6UUUCIAJjNjELUxubrrLQjRZt3tuw_/exec";

let allData = [];
let salesChart;

function cleanNumber(value) {
  if (!value) return 0;

  return Number(
    String(value)
      .replace(/₱/g, "")
      .replace(/,/g, "")
      .trim()
  ) || 0;
}

fetch(API_URL)
  .then(res => res.json())
  .then(data => {

    allData = data;

    populateFilters();
    updateDashboard();

    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
  });

function populateFilters() {

  const years = [...new Set(allData.map(r => r["Year"]).filter(Boolean))];
  const months = [...new Set(allData.map(r => r["Month"]).filter(Boolean))];

  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");

  years.forEach(year => {
    yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
  });

  months.forEach(month => {
    monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
  });

  yearFilter.addEventListener("change", updateDashboard);
  monthFilter.addEventListener("change", updateDashboard);
}

function updateDashboard() {

  const selectedYear = document.getElementById("yearFilter").value;
  const selectedMonth = document.getElementById("monthFilter").value;

  const rows = allData.filter(row => {

    const yearMatch =
      selectedYear === "ALL" ||
      row["Year"] == selectedYear;

    const monthMatch =
      selectedMonth === "ALL" ||
      row["Month"] == selectedMonth;

    return yearMatch && monthMatch;
  });

  const totalSales = rows.reduce((sum, row) => {
    return sum + cleanNumber(row["TOTAL"]);
  }, 0);

  const totalOrders = new Set(
    rows.map(r => r["SO#"]).filter(Boolean)
  ).size;

  const dealerCount = new Set(
    rows.map(r => r["DEALER'S NAME"]).filter(Boolean)
  ).size;

  document.getElementById("totalSales").textContent =
    "₱" + totalSales.toLocaleString();

  document.getElementById("totalOrders").textContent =
    totalOrders;

  document.getElementById("dealerCount").textContent =
    dealerCount;

  updateChart(rows);
  updateDealers(rows);
}

function updateChart(rows) {

  const monthlySales = {};

  rows.forEach(row => {

    const month = row["Month"] || "Unknown";
    const total = cleanNumber(row["TOTAL"]);

    monthlySales[month] =
      (monthlySales[month] || 0) + total;
  });

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(
    document.getElementById("salesChart"),
    {
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
    }
  );
}

function updateDealers(rows) {

  const dealerSales = {};

  rows.forEach(row => {

    const dealer =
      row["DEALER'S NAME"] || "Unknown";

    const total =
      cleanNumber(row["TOTAL"]);

    dealerSales[dealer] =
      (dealerSales[dealer] || 0) + total;
  });

  const topDealers = Object.entries(dealerSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  document.getElementById("dealerTable").innerHTML =
    topDealers.map(([dealer, total]) => `
      <tr>
        <td>${dealer}</td>
        <td>₱${total.toLocaleString()}</td>
      </tr>
    `).join("");
}
