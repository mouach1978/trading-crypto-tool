let coinList = [];

async function loadCoinList() {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/coins/list");
        coinList = await response.json();
    } catch (e) {
        alert("❌ Échec du chargement des cryptos CoinGecko.");
    }
}

async function fetchCurrentPrice(symbol) {
    const lowerSymbol = symbol.toLowerCase();
    const matches = coinList.filter(c => c.symbol === lowerSymbol || c.id === lowerSymbol);
    if (!matches.length) {
        alert("⚠️ Crypto non reconnue : " + symbol);
        return null;
    }
    const coin = matches[0];
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`;
        const res = await fetch(url);
        const data = await res.json();
        const price = data[coin.id]?.usd;
        return typeof price === "number" ? price : null;
    } catch {
        return null;
    }
}

function getStatus(trade) {
    const price = parseFloat(trade.current);
    const sl = parseFloat(trade.sl);
    const pl = parseFloat(trade.pl);
    if (price <= 0) return "⚠️ Prix invalide";
    if (trade.position === "Long") {
        if (price <= sl) return "🟥 Sous SL";
        if (price >= pl) return "🟩 Atteint TP";
    } else {
        if (price >= sl) return "🟥 Sous SL";
        if (price <= pl) return "🟩 Atteint TP";
    }
    return "🔵 En cours";
}

function createRow(trade, index) {
    return `<tr>
      <td>${trade.crypto}</td><td>${trade.type}</td><td>${trade.position}</td>
      <td>${trade.entry} $</td><td>${trade.sl}</td><td>${trade.pl}</td>
      <td>x${trade.leverage}</td><td>${trade.amount} $</td>
      <td>${trade.current} $</td><td>${trade.diffPercent}</td>
      <td style="color:${trade.pnl >= 0 ? 'green' : 'red'}">${trade.pnl} $</td>
      <td>${getStatus(trade)}</td>
      <td><button onclick="editTrade(${index})">✏️</button></td>
    </tr>`;
}

function refreshTable() {
    const trades = JSON.parse(localStorage.getItem("trades") || "[]");
    const tbody = document.querySelector("#trade-table tbody");
    tbody.innerHTML = "";
    trades.forEach((t, i) => tbody.innerHTML += createRow(t, i));
}

function editTrade(i) {
    const trades = JSON.parse(localStorage.getItem("trades") || "[]");
    const t = trades[i];
    document.getElementById("crypto-name").value = t.crypto;
    document.getElementById("order-type").value = t.type;
    document.getElementById("position-type").value = t.position;
    document.getElementById("entry-price").value = t.entry;
    document.getElementById("sl-price").value = t.sl;
    document.getElementById("pl-price").value = t.pl;
    document.getElementById("leverage").value = t.leverage;
    document.getElementById("amount").value = t.amount;
    trades.splice(i, 1);
    localStorage.setItem("trades", JSON.stringify(trades));
    refreshTable();
}

document.addEventListener("DOMContentLoaded", () => {
    loadCoinList();
    refreshTable();
});

document.getElementById("trade-form").addEventListener("submit", async e => {
    e.preventDefault();
    const crypto = document.getElementById("crypto-name").value;
    const type = document.getElementById("order-type").value;
    const position = document.getElementById("position-type").value;
    const entry = parseFloat(document.getElementById("entry-price").value);
    const sl = parseFloat(document.getElementById("sl-price").value || 0);
    const pl = parseFloat(document.getElementById("pl-price").value || 0);
    const leverage = parseFloat(document.getElementById("leverage").value || 1);
    const amount = parseFloat(document.getElementById("amount").value);
    let current = await fetchCurrentPrice(crypto);
    if (!current) {
        const fluct = (Math.random() * 0.06) - 0.03;
        current = entry * (1 + fluct);
    }
    const diffPercent = current > 0 ? ((current - entry) / entry * 100).toFixed(2) + "%" : "N/A";
    const pnl = current > 0 ? ((current - entry) * (amount / entry) * leverage).toFixed(2) : "N/A";
    const trade = {crypto, type, position, entry, sl, pl, leverage, amount, current: current.toFixed(2), diffPercent, pnl};
    const trades = JSON.parse(localStorage.getItem("trades") || "[]");
    trades.push(trade);
    localStorage.setItem("trades", JSON.stringify(trades));
    refreshTable();
    document.getElementById("trade-form").reset();
});
