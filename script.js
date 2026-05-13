const API_URL = "https://script.google.com/macros/s/AKfycbysJCe4fN6kn9GNHC8kNZiwerQo5ffvIlmHWd6UUUCIAJjNjELUxubrrLQjRZt3tuw_/exec";

function cleanNumber(value) {
  if (!value) return 0;

  return Number(
    String(value)
      .replace(/₱/g, "")
      .replace(/,/g, "")
      .replace(/\s/g, "")
  ) || 0;
}

fetch(API_URL)
  .then(response => response.json())
  .then(data => {
    const rows = data.filter(row => cleanNumber(row["TOTAL"]) > 0);

    const totalSales = rows.reduce((sum, row) => {
      return sum + cleanNumber(row["TOTAL"]);
    }, 0);

    const totalOrders = new Set(
      rows.map(row => row["SO#"]).filter(Boolean)
    ).size;

    const dealerCount = new Set(
      rows.map(row => row["DEALER'S NAME"]).filter(Boolean)
    ).size;

    document.getElementById("totalSales").textContent =
      "₱" + totalSales.toLocaleString();

    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("dealerCount").textContent = dealerCount;

    const monthlySales = {};

    rows.forEach(row => {
      const month = row["Month"] || "Unknown";
      const total = cleanNumber(row["TOTAL"]);

      monthlySales[month] = (monthlySales[month] || 0) + total;
    });

    new Chart(document.getElementById("salesChart"), {
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
              color: "#ffffff"
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#ffffff"
            }
          },
          y: {
            ticks: {
              color: "#ffffff"
            }
          }
        }
      }
    });

    const dealerSales = {};

    rows.forEach(row => {
      const dealer = row["DEALER'S NAME"] || "Unknown";
      const total = cleanNumber(row["TOTAL"]);

      dealerSales[dealer] = (dealerSales[dealer] || 0) + total;
    });

    const topDealers = Object.entries(dealerSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    document.getElementById("dealerTable").innerHTML = topDealers.map(([dealer, total]) => `
      <tr>
        <td>${dealer}</td>
        <td>₱${total.toLocaleString()}</td>
      </tr>
    `).join("");

    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
  })
  .catch(error => {
    console.error("Error loading data:", error);

    document.getElementById("loading").innerHTML =
      "<p>Failed to load dashboard.</p>";
  });
