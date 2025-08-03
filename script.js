
let coinList = [];

async function loadCoinList() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
        coinList = await response.json();
    } catch (e) {
        alert("❌ Impossible de charger la liste des cryptos depuis CoinGecko.");
    }
}

async function fetchCurrentPrice(cryptoSymbol) {
    cryptoSymbol = cryptoSymbol.toLowerCase();
    const match = coinList.find(c => c.symbol === cryptoSymbol);
    if (!match) {
        alert(`⚠️ Crypto '${cryptoSymbol}' inconnue. Un prix simulé sera utilisé.`);
        return null;
    }
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd`);
        const data = await response.json();
        return data[match.id]?.usd || null;
    } catch {
        alert("⚠️ CoinGecko API inaccessible. Un prix simulé sera utilisé.");
        return null;
    }
}

function getPnlStatus(trade) {
    const current = parseFloat(trade.current);
    const sl = parseFloat(trade.sl);
    const pl = parseFloat(trade.pl);
    if (trade.position === "Long") {
        if (current <= sl) return "🟥 Sous SL";
        if (current >= pl) return "🟩 Atteint TP";
    } else if (trade.position === "Short") {
        if (current >= sl) return "🟥 Sous SL";
        if (current <= pl) return "🟩 Atteint TP";
    }
    return "🔵 En cours";
}

function createTradeRow(trade, index = -1) {
    
    const pnlStatus = (parseFloat(trade.current) <= 0)
        ? "⚠️ Prix invalide"
        : getPnlStatus(trade);
    
    return `<tr>
        <td>${trade.crypto.toUpperCase()}</td>
        <td>${trade.type}</td>
        <td>${trade.position}</td>
        <td>${trade.entry} $</td>
        <td>${trade.sl || "-"}</td>
        <td>${trade.pl || "-"}</td>
        <td>x${trade.leverage}</td>
        <td>${trade.amount} $</td>
        <td>${trade.current} $</td>
        <td>${trade.diffPercent} %</td>
        <td style="color: ${trade.pnl >= 0 ? 'green' : 'red'};">${trade.pnl} $</td>
        <td>${pnlStatus}</td>
        <td><button onclick="editTrade(${index})">✏️</button></td>
    </tr>`;
}

function refreshTable() {
    const tbody = document.querySelector('#trade-table tbody');
    tbody.innerHTML = '';
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    trades.forEach((trade, index) => {
        const row = createTradeRow(trade, index);
        tbody.innerHTML += row;
    });
}

function saveToLocalStorage(trade) {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    trades.push(trade);
    localStorage.setItem('trades', JSON.stringify(trades));
}

function editTrade(index) {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    const trade = trades[index];
    document.getElementById('crypto-name').value = trade.crypto;
    document.getElementById('order-type').value = trade.type;
    document.getElementById('position-type').value = trade.position;
    document.getElementById('entry-price').value = trade.entry;
    document.getElementById('sl-price').value = trade.sl;
    document.getElementById('pl-price').value = trade.pl;
    document.getElementById('leverage').value = trade.leverage;
    document.getElementById('amount').value = trade.amount;
    trades.splice(index, 1);
    localStorage.setItem('trades', JSON.stringify(trades));
    refreshTable();
}

function exportCSV() {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    if (trades.length === 0) return alert('Aucun trade à exporter.');
    const headers = Object.keys(trades[0]);
    const rows = trades.map(trade => headers.map(h => trade[h]).join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "historique_trades.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearHistory() {
    if (confirm("Supprimer tout l'historique ?")) {
        localStorage.removeItem('trades');
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCoinList();
    refreshTable();
});

document.getElementById('trade-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const crypto = document.getElementById('crypto-name').value;
    const type = document.getElementById('order-type').value;
    const position = document.getElementById('position-type').value;
    const entry = parseFloat(document.getElementById('entry-price').value);
    const sl = parseFloat(document.getElementById('sl-price').value || 0);
    const pl = parseFloat(document.getElementById('pl-price').value || 0);
    const leverage = parseFloat(document.getElementById('leverage').value || 1);
    const amount = parseFloat(document.getElementById('amount').value);
    
    let current = await fetchCurrentPrice(crypto);
    if (current === null) {
        // Simuler un prix aléatoire à ±3% du prix d'entrée
        const fluctuation = (Math.random() * 0.06) - 0.03;
        current = entry * (1 + fluctuation);
        alert("📉 Prix simulé utilisé : " + current.toFixed(2) + " $");
    }
    
    
    const diffPercent = current > 0
        ? ((current - entry) / entry * 100).toFixed(2)
        : "N/A";
    
    
    const pnl = current > 0
        ? ((current - entry) * (amount / entry) * leverage).toFixed(2)
        : "N/A";
    
    const trade = {
        crypto, type, position, entry, sl, pl, leverage, amount,
        current: current.toFixed(2), diffPercent, pnl
    };
    const row = createTradeRow(trade);
    document.querySelector('#trade-table tbody').innerHTML += row;
    saveToLocalStorage(trade);
    document.getElementById('trade-form').reset();
});

document.body.insertAdjacentHTML('beforeend', `
    <div style="margin-top: 20px;">
        <button onclick="exportCSV()">📤 Exporter en CSV</button>
        <button onclick="clearHistory()">🗑️ Supprimer l'historique</button>
    </div>
`);
