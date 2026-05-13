const API_URL = "https://script.google.com/macros/s/AKfycbysJCe4fN6kn9GNHC8kNZiwerQo5ffvIlmHWd6UUUCIAJjNjELUxubrrLQjRZt3tuw_/exec";

fetch(API_URL)
  .then(response => response.json())
  .then(data => {
    const rows = data.filter(row => row["TOTAL"]);

    const totalSales = rows.reduce((sum, row) => {
  const value = cleanNumber(row["TOTAL"]);

  if (isNaN(value)) return sum;

  return sum + value;
}, 0);

    const totalOrders = new Set(rows.map(row => row["SO#"])).size;
    const dealerCount = new Set(rows.map(row => row["DEALER'S NAME"])).size;

    document.getElementById("totalSales").textContent =
      "₱" + totalSales.toLocaleString();

    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("dealerCount").textContent = dealerCount;

    const dealerSales = {};

    rows.forEach(row => {
      const dealer = row["DEALER'S NAME"] || "Unknown";
      const total = Number(row["TOTAL"] || 0);

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
  });
