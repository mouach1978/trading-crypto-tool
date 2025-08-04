
let coinList = [];

async function loadCoinList() {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/coins/list");
        coinList = await response.json();
    } catch {
        alert("❌ Échec du chargement des cryptos CoinGecko.");
    }
}

async function fetchCurrentPrice(symbol) {
    if (!coinList.length) return null;
    const sym = symbol.trim().toLowerCase();
    const match = coinList.find(c => c.id === sym || c.symbol === sym || c.name.toLowerCase() === sym);
    if (!match) return null;
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd`);
        const data = await res.json();
        const price = data[match.id]?.usd;
        return typeof price === "number" ? price : null;
    } catch {
        return null;
    }
}

function getStatus(t) {
    const p = parseFloat(t.current);
    const sl = parseFloat(t.sl);
    const tp = parseFloat(t.pl);
    if (p <= 0) return "❌ Prix invalide";
    if (t.position === "Long") {
        if (p <= sl) return "🟥 Sous SL";
        if (p >= tp) return "🟩 Atteint TP";
    } else {
        if (p >= sl) return "🟥 Sous SL";
        if (p <= tp) return "🟩 Atteint TP";
    }
    return "🔵 En cours";
}

function createRow(t, i) {
    return `<tr>
      <td>${t.crypto}</td><td>${t.type}</td><td>${t.position}</td>
      <td>${t.entry} $</td><td>${t.sl}</td><td>${t.pl}</td>
      <td>x${t.leverage}</td><td>${t.amount} $</td>
      <td>${t.current} $</td><td>${t.diffPercent}</td>
      <td style="color:${t.pnl >= 0 ? 'green' : 'red'}">${t.pnl} $</td>
      <td>${getStatus(t)}</td>
      <td><button onclick="editTrade(${i})">✏️</button></td>
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
    if (!current || current <= 0) {
        alert("❌ Prix actuel introuvable. Trade annulé.");
        return;
    }
    const diffPercent = ((current - entry) / entry * 100).toFixed(2) + "%";
    const pnl = ((current - entry) * (amount / entry) * leverage).toFixed(2);
    const trade = {
        crypto, type, position, entry, sl, pl, leverage, amount,
        current: current.toFixed(2), diffPercent, pnl
    };
    const trades = JSON.parse(localStorage.getItem("trades") || "[]");
    trades.push(trade);
    localStorage.setItem("trades", JSON.stringify(trades));
    refreshTable();
    document.getElementById("trade-form").reset();
});
