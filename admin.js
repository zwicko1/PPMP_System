document.addEventListener("DOMContentLoaded", () => {
    
    // A flag to tell us if we should load the data at the end of the script
    let isLoggedInAdmin = false;

    // ==========================================
    // 1. ADMIN ROUTE GUARD (Security & Display Only)
    // ==========================================
    if (localStorage.getItem('auth_token')) {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            const user = JSON.parse(userDataStr);
            if (user.role_id === 1) {
                // They are an admin! Hide login, show dashboard.
                const loginSec = document.getElementById('adminLoginSection');
                const dashApp = document.getElementById('adminDashboardApp');
                
                if(loginSec) loginSec.style.display = 'none';
                if(dashApp) dashApp.style.display = 'block';
                
                const adminNameDisplay = document.getElementById('adminWelcomeText');
                if(adminNameDisplay) adminNameDisplay.innerText = "Logged in as: " + (user.unit_name || "Admin");
                
                // Set the flag to true so we can load the data later
                isLoggedInAdmin = true; 
            } else {
                // They are a Sector trying to sneak in
                localStorage.clear();
                alert("Access Denied: You must be an Administrator.");
                window.location.replace("index.html");
            }
        }
    }

    // ==========================================
    // 2. ADMIN LOGIN LOGIC
    // ==========================================
    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const email = document.getElementById('adminEmailInput').value;
            const password = document.getElementById('adminPasswordInput').value;
            const msg = document.getElementById('adminLoginMessage');

            msg.style.color = "blue";
            msg.innerText = "Authenticating Admin...";

            fetch('http://127.0.0.1:8000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    if (data.user.role_id !== 1) {
                        msg.style.color = "red";
                        msg.innerText = "Unauthorized: You are not an Administrator.";
                        return;
                    }
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.reload(); 
                } else {
                    msg.style.color = "red";
                    msg.innerText = data.message || "Login failed.";
                }
            })
            .catch(error => {
                console.error(error);
                msg.style.color = "red";
                msg.innerText = "Server connection failed.";
            });
        });
    }

    // ==========================================
    // 3. BULLETPROOF ADMIN LOGOUT LOGIC
    // ==========================================
    document.addEventListener('click', function(e) {
        const clickedLogout = e.target.closest('#adminLogoutBtn');
        if (clickedLogout) {
            e.preventDefault();
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.clear();
            window.location.replace('admin.html');
        }
    });

    // ==========================================
    // 4. TAB NAVIGATION LOGIC
    // ==========================================
    const tabBudget = document.getElementById("tabBudget");
    const tabPpmp = document.getElementById("tabPpmp");
    const budgetPanel = document.getElementById("budgetPanel");
    const ppmpPanel = document.getElementById("ppmpPanel");

    if (tabBudget && tabPpmp) {
        tabBudget.addEventListener("click", () => {
            budgetPanel.style.display = "block";
            ppmpPanel.style.display = "none";
            
            tabBudget.style.background = "#c14f3b";
            tabBudget.style.border = "none";
            tabPpmp.style.background = "transparent";
            tabPpmp.style.border = "1px solid #7f8c8d";
            
            loadDashboard(); // Refresh budget data
        });

        tabPpmp.addEventListener("click", () => {
            budgetPanel.style.display = "none";
            ppmpPanel.style.display = "block";
            
            tabPpmp.style.background = "#c14f3b";
            tabPpmp.style.border = "none";
            tabBudget.style.background = "transparent";
            tabBudget.style.border = "1px solid #7f8c8d";
            
            loadAdminPpmps(); // Fetch PPMP data
        });
    }

    // ==========================================
    // 5. BUDGET DASHBOARD LOGIC
    // ==========================================
    const yearFilter = document.getElementById("yearFilter");
    if(yearFilter) {
        yearFilter.value = new Date().getFullYear() + 1;
        yearFilter.addEventListener("change", loadDashboard);
    }

    function loadDashboard() {
        const token = localStorage.getItem('auth_token');
        // Safely grab the year, fallback to next year if not found
        const yearInput = document.getElementById("yearFilter");
        const year = yearInput ? yearInput.value : (new Date().getFullYear() + 1);
        const tbody = document.getElementById("tableBody");
        
        if(!tbody) return; 
        
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Refreshing...</td></tr>';

        Promise.all([
            fetch('http://127.0.0.1:8000/api/admin/sectors', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
            fetch(`http://127.0.0.1:8000/api/admin/budgets?year=${year}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
        ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([sectors, budgets]) => {
            if (sectors.message === "Unauthorized") {
                localStorage.clear();
                window.location.replace("index.html");
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

    // ==========================================
    // 6. BUDGET MODAL LOGIC
    // ==========================================
    let currentSectorId = null;
    const modal = document.getElementById("budgetModal");

    window.openModal = function(sectorId, sectorName, currentAmount) {
        currentSectorId = sectorId;
        document.getElementById("modalSectorName").innerText = sectorName;
        document.getElementById("modalYearLabel").innerText = document.getElementById("yearFilter").value;
        document.getElementById("modalBudgetInput").value = currentAmount;
        document.getElementById("modalError").style.display = "none";
        modal.style.display = "flex";
    };

    const closeBtn = document.getElementById("closeModalBtn");
    if(closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    const saveBtn = document.getElementById("saveBudgetBtn");
    if(saveBtn) {
        saveBtn.addEventListener("click", () => {
            const token = localStorage.getItem('auth_token');
            const amount = document.getElementById("modalBudgetInput").value;
            const year = document.getElementById("yearFilter").value;
            const errorMsg = document.getElementById("modalError");

            if (!amount || amount < 0) {
                errorMsg.innerText = "Please enter a valid amount.";
                errorMsg.style.display = "block";
                return;
            }

            saveBtn.innerText = "Saving...";
            saveBtn.disabled = true;

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
                saveBtn.innerText = "💾 Save";
                saveBtn.disabled = false;

                if (data.status === 'success') {
                    modal.style.display = "none";
                    loadDashboard();
                } else {
                    errorMsg.innerText = data.message || "Failed to save.";
                    errorMsg.style.display = "block";
                }
            })
            .catch(error => {
                console.error("Save error:", error);
                saveBtn.innerText = "💾 Save";
                saveBtn.disabled = false;
            });
        });
    }

    // ==========================================
    // 7. PPMP APPROVAL LOGIC
    // ==========================================
    function loadAdminPpmps() {
        const token = localStorage.getItem('auth_token');
        const tbody = document.querySelector("#adminPpmpTable tbody");
        if(!tbody) return; 
        
        tbody.innerHTML = "<tr><td colspan='6' style='text-align: center; padding: 20px;'>Loading PPMPs...</td></tr>";

        fetch('http://127.0.0.1:8000/api/admin/ppmps', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json' 
            }
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                renderAdminPpmpTable(data.data);
            } else {
                tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error loading PPMPs</td></tr>";
            }
        })
        .catch(error => console.error("PPMP Load Error:", error));
    }

    function renderAdminPpmpTable(ppmps) {
        const tbody = document.querySelector("#adminPpmpTable tbody");
        tbody.innerHTML = "";

        if (ppmps.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align: center; padding: 20px; color: #666;'>No PPMPs have been submitted yet.</td></tr>";
            return;
        }

        ppmps.forEach(ppmp => {
            const totalBudget = ppmp.items.reduce((sum, item) => sum + parseFloat(item.estimated_budget), 0);
            
            let actionButtons = '';
            if (ppmp.status === 'Pending') {
                actionButtons = `
                    <button onclick="updatePpmpStatus(${ppmp.id}, 'Approved')" style="background: #198754; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; margin-right: 5px;">✅ Approve</button>
                    <button onclick="updatePpmpStatus(${ppmp.id}, 'Rejected')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px;">❌ Reject</button>
                `;
            } else if (ppmp.status === 'Approved') {
                actionButtons = `<span style="color: #198754; font-weight: bold;">✓ Approved</span>`;
            } else {
                actionButtons = `<span style="color: #dc3545; font-weight: bold;">✗ Rejected</span>`;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${ppmp.id}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${ppmp.fiscal_year}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${ppmp.user ? ppmp.user.unit_name : 'Unknown Sector'}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #198754; font-weight: 600;">₱${totalBudget.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;"><strong>${ppmp.status}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${actionButtons}</td>
            `;
            tbody.appendChild(row);
        });
    }

    window.updatePpmpStatus = function(id, newStatus) {
        if (!confirm(`Are you sure you want to mark PPMP #${id} as ${newStatus}?`)) return;

        const token = localStorage.getItem('auth_token');
        
        fetch(`http://127.0.0.1:8000/api/admin/ppmps/${id}/status`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                alert(`PPMP #${id} successfully marked as ${newStatus}!`);
                loadAdminPpmps(); 
            } else {
                alert(data.message || "An error occurred while updating.");
            }
        });
    };

    // ==========================================
    // 8. INITIALIZE APP (Safely at the end!)
    // ==========================================
    // We only call this AFTER all functions and variables above are fully loaded
    if (isLoggedInAdmin) {
        loadDashboard();
    }

});