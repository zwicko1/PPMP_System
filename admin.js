document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const adminName = localStorage.getItem('user_name');
    if (adminName) document.getElementById('adminName').innerText = "Welcome, " + adminName;

    const yearFilter = document.getElementById("yearFilter");
    yearFilter.value = new Date().getFullYear() + 1;

    yearFilter.addEventListener("change", loadDashboard);

    function loadDashboard() {
        const year = yearFilter.value;
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Refreshing...</td></tr>';

        Promise.all([
            fetch('http://127.0.0.1:8000/api/admin/sectors', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
            fetch(`http://127.0.0.1:8000/api/admin/budgets?year=${year}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
        ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([sectors, budgets]) => {
            
            if (sectors.message === "Unauthorized") {
                window.location.href = "index.html";
                return;
            }

            tbody.innerHTML = "";
            let grandTotal = 0;

            sectors.forEach(sector => {
                const sectorBudget = budgets.find(b => b.user_id === sector.id);
                const row = document.createElement("tr");

                if (sectorBudget) {
                    const amount = parseFloat(sectorBudget.allocated_amount);
                    grandTotal += amount;
                    
                    const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    row.innerHTML = `
                        <td><strong>${sector.unit_name}</strong></td>
                        <td style="text-align: right; color: #198754; font-weight: 600;">₱ ${formattedAmount}</td>
                        <td style="text-align: center;">
                            <button class="btn-edit" onclick="openModal(${sector.id}, '${sector.unit_name}', ${amount})">✏️ Edit</button>
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td><strong>${sector.unit_name}</strong></td>
                        <td style="text-align: right; color: #6c757d; font-style: italic;">Not yet allocated</td>
                        <td style="text-align: center;">
                            <button class="btn-allocate" onclick="openModal(${sector.id}, '${sector.unit_name}', '')">➕ Allocate</button>
                        </td>
                    `;
                }
                tbody.appendChild(row);
            });

            const tfoot = document.getElementById("tableFooter");
            const totalCell = document.getElementById("totalBudgetValue");
            
            if (sectors.length > 0) {
                tfoot.style.display = "table-footer-group";
                totalCell.innerText = "₱ " + grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                tfoot.style.display = "none";
            }
        })
        .catch(error => console.error("Error loading dashboard:", error));
    }

    loadDashboard();

    let currentSectorId = null;
    const modal = document.getElementById("budgetModal");

    window.openModal = function(sectorId, sectorName, currentAmount) {
        currentSectorId = sectorId;
        document.getElementById("modalSectorName").innerText = sectorName;
        document.getElementById("modalYearLabel").innerText = yearFilter.value;
        document.getElementById("modalBudgetInput").value = currentAmount;
        document.getElementById("modalError").style.display = "none";
        modal.style.display = "flex";
    };

    document.getElementById("closeModalBtn").addEventListener("click", () => {
        modal.style.display = "none";
    });

    document.getElementById("saveBudgetBtn").addEventListener("click", () => {
        const amount = document.getElementById("modalBudgetInput").value;
        const year = yearFilter.value;
        const errorMsg = document.getElementById("modalError");

        if (!amount || amount < 0) {
            errorMsg.innerText = "Please enter a valid amount.";
            errorMsg.style.display = "block";
            return;
        }

        const btn = document.getElementById("saveBudgetBtn");
        btn.innerText = "Saving...";
        btn.disabled = true;

        fetch('http://127.0.0.1:8000/api/admin/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                user_id: currentSectorId,
                fiscal_year: year,
                amount: amount
            })
        })
        .then(response => response.json())
        .then(data => {
            btn.innerText = "💾 Save";
            btn.disabled = false;

            if (data.status === 'success') {
                modal.style.display = "none";
                loadDashboard();
            } else {
                errorMsg.innerText = data.message || "Failed to save.";
                errorMsg.style.display = "block";
            }
        })
        .catch(error => console.error("Save error:", error));
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });
});