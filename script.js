
let coinList = [];

async function loadCoinList() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
        coinList = await response.json();
    } catch (e) {
        alert("❌ Impossible de charger la liste des cryptos depuis CoinGecko.");
    }
}

async function fetchCurrentPrice(symbol) {
    const coin = coinList.find(c => c.symbol === symbol.toLowerCase());
    if (!coin) {
        alert("⚠️ Crypto non reconnue : " + symbol);
        return null;
    }
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`);
        const data = await response.json();
        return data[coin.id]?.usd || null;
    } catch {
        return null;
    }
}

function getPnlStatus(trade) {
    const c = parseFloat(trade.current);
    const sl = parseFloat(trade.sl);
    const pl = parseFloat(trade.pl);
    if (c <= 0) return "⚠️ Prix invalide";
    if (trade.position === "Long") {
        if (c <= sl) return "🟥 Sous SL";
        if (c >= pl) return "🟩 Atteint TP";
    } else {
        if (c >= sl) return "🟥 Sous SL";
        if (c <= pl) return "🟩 Atteint TP";
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
        <td>${getPnlStatus(trade)}</td>
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
    ["crypto", "order-type", "position-type", "entry-price", "sl-price", "pl-price", "leverage", "amount"].forEach(id =>
        document.getElementById(id).value = t[id.replace("-", "_")] || t[id]);
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
