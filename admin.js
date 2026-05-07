document.addEventListener("DOMContentLoaded", () => {
    
    // A flag to tell us if we should load the data at the end of the script
    let isLoggedInAdmin = false;

    // ==========================================
    // ADMIN ROUTE GUARD (Security & Display Only)
    // ==========================================
    if (localStorage.getItem('auth_token')) {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            const user = JSON.parse(userDataStr);
            if (user.role_id === 1) {
                const loginSec = document.getElementById('adminLoginSection');
                const dashApp = document.getElementById('adminDashboardApp');
                
                if(loginSec) loginSec.style.display = 'none';
                if(dashApp) dashApp.style.display = 'block';
                
                const adminNameDisplay = document.getElementById('adminWelcomeText');
                if(adminNameDisplay) adminNameDisplay.innerText = "Logged in as: " + (user.unit_name || "Admin");
                
                isLoggedInAdmin = true; 
            } else {
                localStorage.clear();
                alert("Access Denied: You must be an Administrator.");
                window.location.replace("index.html");
            }
        }
    }

    // ==========================================
    // ADMIN LOGIN LOGIC
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
    // BULLETPROOF ADMIN LOGOUT LOGIC
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
    // TAB NAVIGATION LOGIC
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
            
            loadDashboard(); 
        });

        tabPpmp.addEventListener("click", () => {
            budgetPanel.style.display = "none";
            ppmpPanel.style.display = "block";
            
            tabPpmp.style.background = "#c14f3b";
            tabPpmp.style.border = "none";
            tabBudget.style.background = "transparent";
            tabBudget.style.border = "1px solid #7f8c8d";
            
            loadAdminPpmps(); // Fetch PPMP data when tab is clicked
        });
    }

    // ==========================================
    // BUDGET DASHBOARD LOGIC
    // ==========================================
    const yearFilter = document.getElementById("yearFilter");
    if(yearFilter) {
        yearFilter.value = new Date().getFullYear() + 1;
        yearFilter.addEventListener("change", loadDashboard);
    }

    function loadDashboard() {
        const token = localStorage.getItem('auth_token');
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
    // BUDGET MODAL LOGIC
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
    // PENDING PPMP APPROVALS (Grouped & Nested!)
    // ==========================================
    window.loadAdminPpmps = function() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const tbody = document.getElementById('adminPendingTableBody') || document.querySelector("#adminPpmpTable tbody");
        if(!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">Loading pending submissions...</td></tr>';

        fetch('http://127.0.0.1:8000/api/admin/ppmps/pending', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            tbody.innerHTML = ''; 

            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; padding: 40px; color: #198754; font-weight: bold; font-size: 1.1rem;">
                            🎉 All caught up! No pending PPMPs to review.
                        </td>
                    </tr>`;
                return;
            }

            // ==========================================
            // ALGORITHM: Group data by Sector AND Year
            // ==========================================
            const groupedPpmps = {};
            data.data.forEach(ppmp => {
                // Creates a unique key like "3_2027"
                const key = `${ppmp.user_id}_${ppmp.fiscal_year}`;
                if(!groupedPpmps[key]) groupedPpmps[key] = [];
                groupedPpmps[key].push(ppmp);
            });

            // ==========================================
            // RENDER: Loop through each group
            // ==========================================
            Object.values(groupedPpmps).forEach(group => {
                group.sort((a, b) => b.version - a.version);

                const latest = group[0];
                const olderRevisions = group.slice(1);
                
                const sectorName = latest.user ? latest.user.unit_name : 'Unknown Sector';
                const latestDateObj = new Date(latest.created_at);
                const latestNiceDate = latestDateObj.toLocaleDateString() + ' ' + latestDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                let expandBtn = '';
                if (olderRevisions.length > 0) {
                    expandBtn = `<br><button onclick="toggleRevisions('rev-${latest.id}')" style="background: none; border: none; color: #0d6efd; font-size: 0.8em; text-decoration: underline; cursor: pointer; padding: 0; margin-top: 5px;">[+] View ${olderRevisions.length} Older Revision(s)</button>`;
                }

                const mainRow = document.createElement('tr');
                mainRow.style.borderBottom = olderRevisions.length > 0 ? "none" : "1px solid #eee";
                mainRow.style.background = "#fff";
                
                mainRow.innerHTML = `
                    <td style="padding: 15px;">
                        <strong>${sectorName}</strong>
                        ${expandBtn}
                    </td>
                    <td style="padding: 15px; font-weight: 600;">${latest.fiscal_year}</td>
                    <td style="padding: 15px;">
                        <span style="background: #ffc107; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #000;">
                            v${latest.version} (Latest)
                        </span>
                    </td>
                    <td style="padding: 15px; color: #333;">${latestNiceDate}</td>
                    <td style="padding: 15px; text-align: center;">
                        <button onclick="reviewPpmp(${latest.id})" style="background-color: #0d6efd; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            🔍 Review
                        </button>
                    </td>
                `;
                tbody.appendChild(mainRow);

                olderRevisions.forEach((old, index) => {
                    const oldRow = document.createElement('tr');
                    oldRow.className = `rev-${latest.id}`;
                    oldRow.style.display = 'none';
                    oldRow.style.background = '#f8f9fa';
                    
                    oldRow.style.borderBottom = index === olderRevisions.length - 1 ? "1px solid #eee" : "none";

                    const oldDateObj = new Date(old.created_at);
                    const oldNiceDate = oldDateObj.toLocaleDateString() + ' ' + oldDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                    oldRow.innerHTML = `
                        <td style="padding: 10px 15px 10px 40px; color: #6c757d; font-size: 0.9em;">↳ Older Revision</td>
                        <td style="padding: 10px 15px; color: #6c757d; font-size: 0.9em;">${old.fiscal_year}</td>
                        <td style="padding: 10px 15px;">
                            <span style="background: #e9ecef; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: #6c757d;">
                                v${old.version}
                            </span>
                        </td>
                        <td style="padding: 10px 15px; color: #6c757d; font-size: 0.9em;">${oldNiceDate}</td>
                        <td style="padding: 10px 15px; text-align: center;">
                            <button onclick="viewOldPpmp(${old.id})" style="background-color: #6c757d; color: white; border: none; padding: 4px 10px; cursor: pointer; border-radius: 4px; font-size: 0.85em; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                                👁️ View Only
                            </button>
                            <div style="color: #adb5bd; font-size: 0.75em; font-style: italic; margin-top: 4px;">Superseded by v${latest.version}</div>
                        </td>
                    `;
                    tbody.appendChild(oldRow);
                });
            });
        })
        .catch(error => console.error("Error fetching pending PPMPs:", error));
    };

    // ==========================================
    // THE TOGGLE LOGIC FOR NESTED ROWS
    // ==========================================
    window.toggleRevisions = function(className) {
        const rows = document.querySelectorAll('.' + className);
        rows.forEach(row => {
            row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
        });
    };

    // ==========================================
    // MASTER REVIEW MODAL LOGIC
    // ==========================================
    const reviewModal = document.getElementById("reviewModal");
    const closeReviewBtn = document.getElementById("closeReviewModalBtn");

    if (closeReviewBtn) {
        closeReviewBtn.addEventListener("click", () => {
            reviewModal.style.display = "none";
        });
    }

    window.reviewPpmp = function(ppmpId) {
        openReviewModal(ppmpId, 'review');
    };

    window.viewOldPpmp = function(ppmpId) {
        openReviewModal(ppmpId, 'readonly');
    };

    function openReviewModal(ppmpId, mode) {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        reviewModal.style.display = "flex";

        const titleEl = document.getElementById("modalReviewTitle");
        const subtitleEl = document.getElementById("modalReviewSubtitle");
        const footerEl = document.getElementById("reviewModalFooter");
        const tbody = document.getElementById("reviewModalTableBody");

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">Fetching project details...</td></tr>';
        
        if (mode === 'readonly') {
            titleEl.innerText = `Viewing Old Revision (ID: ${ppmpId})`;
            titleEl.style.color = "#6c757d";
            subtitleEl.innerText = "This is a superseded version. It is locked for auditing purposes.";
            footerEl.innerHTML = "";
        } else if (mode === 'review') {
            titleEl.innerText = `Reviewing Latest PPMP (ID: ${ppmpId})`;
            titleEl.style.color = "#0d6efd";
            subtitleEl.innerText = "Carefully review the requested items below before making a decision.";
            footerEl.innerHTML = "<i>(Approve/Reject buttons will go here next!)</i>"; 
        }

        fetch(`http://127.0.0.1:8000/api/admin/ppmps/${ppmpId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success' && data.data.items) {
                tbody.innerHTML = ""; 
                let total = 0;

                data.data.items.forEach(item => {
                    const cost = parseFloat(item.estimated_budget);
                    total += cost;
                    
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>${item.description}</strong></td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${item.type}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">${item.quantity}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${item.mode_of_procurement}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-size: 0.9em;">${item.start_date.substring(0,7)} to ${item.end_date.substring(0,7)}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; color: #198754; font-weight: bold; text-align: right;">
                            ₱${cost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                const totalRow = document.createElement("tr");
                totalRow.style.backgroundColor = "#fff9f9";
                totalRow.innerHTML = `
                    <td colspan="5" style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">Grand Total Requested:</td>
                    <td style="padding: 12px; border: 1px solid #dee2e6; color: #c14f3b; font-weight: 900; text-align: right; font-size: 1.1em;">
                        ₱${total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                `;
                tbody.appendChild(totalRow);

            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 30px;">Failed to load items.</td></tr>';
            }
        })
        .catch(error => {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 30px;">Connection error.</td></tr>';
        });
    }

    // ==========================================
    // INITIALIZE APP 
    // ==========================================
    if (isLoggedInAdmin) {
        loadDashboard();
    }
});