document.addEventListener("DOMContentLoaded", () => {
    
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
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                alert("Access Denied: You must be an Administrator.");
                window.location.replace("index.html");
            }
        }
    }

    // ==========================================
    // ADMIN LOGIN LOGIC
    // ==========================================
    const loginBtn = document.getElementById('adminLoginBtn');

    // ==========================================
    // ALLOW "ENTER" KEY FOR ADMIN LOGIN (Moved OUTSIDE!)
    // ==========================================
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const adminEmailInput = document.getElementById('adminEmailInput');

    function triggerAdminLogin(event) {
        if (event.key === "Enter" || event.keyCode === 13) {
            event.preventDefault(); 
            if (loginBtn) loginBtn.click(); 
        }
    }

    if (adminPasswordInput) adminPasswordInput.addEventListener("keydown", triggerAdminLogin);
    if (adminEmailInput) adminEmailInput.addEventListener("keydown", triggerAdminLogin);

    // ==========================================
    // MAIN ADMIN LOGIN BUTTON CLICK
    // ==========================================
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // 1. Get the DOM elements
            const emailInputEl = document.getElementById('adminEmailInput');
            const passwordInputEl = document.getElementById('adminPasswordInput');
            const msg = document.getElementById('adminLoginMessage');

            const email = emailInputEl.value;
            const password = passwordInputEl.value;

            // 2. Lock the UI!
            emailInputEl.disabled = true;
            passwordInputEl.disabled = true;
            loginBtn.disabled = true;
            loginBtn.style.cursor = "wait";

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
                        
                        // Booting non-admins: unlock the UI
                        emailInputEl.disabled = false;
                        passwordInputEl.disabled = false;
                        loginBtn.disabled = false;
                        loginBtn.style.cursor = "pointer";
                        return;
                    }
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.reload(); 
                } else {
                    // Login failed: Unlock the UI
                    msg.style.color = "red";
                    msg.innerText = data.message || "Login failed.";
                    
                    emailInputEl.disabled = false;
                    passwordInputEl.disabled = false;
                    loginBtn.disabled = false;
                    loginBtn.style.cursor = "pointer";
                }
            })
            .catch(error => {
                console.error(error);
                msg.style.color = "red";
                msg.innerText = "Server connection failed.";
                
                // Network error: Unlock the UI
                emailInputEl.disabled = false;
                passwordInputEl.disabled = false;
                loginBtn.disabled = false;
                loginBtn.style.cursor = "pointer";
            });
        });
    }

    // ==========================================
    // DYNAMIC SECURE LOGOUT & IDLE TIMER (ADMIN)
    // ==========================================
    let adminIdleTimer;
    window.IDLE_TIMEOUT_MS = 300000; // Fallback default (5 mins)

    // FETCH THE DYNAMIC TIMER ON LOAD
    if (localStorage.getItem('auth_token')) {
        fetch('http://127.0.0.1:8000/api/settings/timeout', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.timeout_ms) {
                window.IDLE_TIMEOUT_MS = data.timeout_ms;
                // Pre-fill the input box so the Admin sees the current setting (convert ms back to minutes)
                const inputEl = document.getElementById('adminTimeoutInput');
                if(inputEl) inputEl.value = (data.timeout_ms / 1000 / 60);
                
                resetAdminIdleTimer(); 
            }
        });
    }

    function performAdminSecureLogout(isTimeout = false) {
        const token = localStorage.getItem('auth_token');
        if (token) {
            document.body.style.cursor = 'wait';
            fetch('http://127.0.0.1:8000/api/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            }).finally(() => {
                document.body.style.cursor = 'default';
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                if (isTimeout) alert("Security Timeout: Admin session expired due to inactivity.");
                window.location.replace('admin.html');
            });
        }
    }

    function resetAdminIdleTimer() {
        clearTimeout(adminIdleTimer);
        if (localStorage.getItem('auth_token')) {
            adminIdleTimer = setTimeout(() => performAdminSecureLogout(true), window.IDLE_TIMEOUT_MS);
        }
    }

    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetAdminIdleTimer);
    });

    document.addEventListener('click', function(e) {
        const clickedLogout = e.target.closest('#adminLogoutBtn');
        if (clickedLogout) {
            e.preventDefault();
            performAdminSecureLogout(false);
        }
    });

    // ==========================================
    // TAB NAVIGATION LOGIC
    // ==========================================
    const tabBudget = document.getElementById("tabBudget");
    const tabPpmp = document.getElementById("tabPpmp");
    const tabData = document.getElementById("tabData");

    const budgetPanel = document.getElementById("budgetPanel");
    const ppmpPanel = document.getElementById("ppmpPanel");
    const dataPanel = document.getElementById("dataPanel");

    function resetTabs() {
        [tabBudget, tabPpmp, tabData].forEach(tab => {
            if(tab) {
                tab.style.background = "transparent";
                tab.style.border = "1px solid #7f8c8d";
            }
        });
        [budgetPanel, ppmpPanel, dataPanel].forEach(panel => {
            if(panel) panel.style.display = "none";
        });
    }

    if (tabBudget && tabPpmp && tabData) {
        
        tabBudget.addEventListener("click", () => {
            resetTabs();
            budgetPanel.style.display = "block";
            tabBudget.style.background = "#c14f3b";
            tabBudget.style.border = "none";
            if (typeof loadDashboard === "function") loadDashboard(); 
        });

        tabPpmp.addEventListener("click", () => {
            resetTabs();
            ppmpPanel.style.display = "block";
            tabPpmp.style.background = "#c14f3b";
            tabPpmp.style.border = "none";
            if (typeof loadAdminPpmps === "function") loadAdminPpmps(); 
        });

        tabData.addEventListener("click", () => {
            resetTabs();
            dataPanel.style.display = "block";
            tabData.style.background = "#c14f3b";
            tabData.style.border = "none";
            if (typeof window.loadAdminDataTables === "function") window.loadAdminDataTables(); 
        });
        
    } else {
        console.error("Tab Navigation Error: One of the tab or panel IDs is missing in the HTML!");
    }

    // ==========================================
    // BUDGET DASHBOARD LOGIC
    // ==========================================
    window.currentAllocatedTotal = 0;

    const yearFilter = document.getElementById("yearFilter");
    if(yearFilter) {
        yearFilter.value = new Date().getFullYear() + 1;
        yearFilter.addEventListener("change", loadDashboard);
    }

    const ppmpYearFilter = document.getElementById("ppmpYearFilter");
    if(ppmpYearFilter) {
        ppmpYearFilter.value = new Date().getFullYear() + 1;
        ppmpYearFilter.addEventListener("change", () => {
            if (typeof window.loadAdminPpmps === "function") window.loadAdminPpmps();
        });
    }

    function recalculateUnallocatedRealTime() {
        const masterStr = document.getElementById("masterBudgetInput").value.replace(/[^0-9.-]/g, '');
        const master = parseFloat(masterStr) || 0;

        const unallocated = master - window.currentAllocatedTotal;
        const unallocatedEl = document.getElementById("summaryUnallocated");
        
        if (unallocatedEl) {
            unallocatedEl.innerText = "₱ " + Math.abs(unallocated).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (unallocated < 0) {
                unallocatedEl.innerText = "- " + unallocatedEl.innerText;
                unallocatedEl.style.color = "#dc3545";
                unallocatedEl.parentElement.style.borderLeftColor = "#dc3545";
            } else {
                unallocatedEl.style.color = "#198754";
                unallocatedEl.parentElement.style.borderLeftColor = "#198754";
            }
        }
    }

    // --- Live Currency Formatter for Master Budget ---
    const masterBudgetInput = document.getElementById("masterBudgetInput");
    if (masterBudgetInput) {
        masterBudgetInput.addEventListener("input", function(e) {
            let value = this.value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
            
            if (value) {
                let cleanParts = value.split('.');
                let formatted = cleanParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                if (cleanParts.length > 1) formatted += '.' + cleanParts[1].substring(0, 2);
                this.value = formatted;
            } else {
                this.value = '';
            }
            
            recalculateUnallocatedRealTime();
        });
    }

    window.saveMasterBudget = function() {
        const token = localStorage.getItem('auth_token');
        const year = document.getElementById("yearFilter").value;
        const rawValue = document.getElementById("masterBudgetInput").value.replace(/[^0-9.-]/g, '');
        const numericValue = parseFloat(rawValue) || 0;

        if (numericValue < window.currentAllocatedTotal) {
            alert("Error: You cannot shrink the University Budget below the total amount already allocated to sectors (₱" + window.currentAllocatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2}) + ").\n\nPlease reduce the Sector budgets first!");
 
            const masterEl = document.getElementById("masterBudgetInput");
            if(masterEl) masterEl.value = window.currentAllocatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            recalculateUnallocatedRealTime();
            return;
        }
        
        const btn = document.querySelector('button[onclick="saveMasterBudget()"]');
        if (btn) {
            btn.innerText = "Saving...";
            btn.disabled = true;
        }

        fetch('http://127.0.0.1:8000/api/admin/master-budget', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            // Ensuring strict numeric formatting so Laravel doesn't reject it
            body: JSON.stringify({ fiscal_year: parseInt(year), total_amount: numericValue }) 
        })
        .then(async res => {
            const data = await res.json();
            // STRICT CHECK: If Laravel doesn't explicitly say 'success', throw an error!
            if (!res.ok || data.status !== 'success') {
                throw new Error(data.message || "Laravel Database Error");
            }
            return data;
        })
        .then(data => {
            if (btn) {
                btn.innerText = "Saved!";
                btn.style.background = "#198754";
                setTimeout(() => {
                    btn.innerText = "Save";
                    btn.style.background = "#0d6efd";
                    btn.disabled = false;
                }, 1000);
            }
            loadDashboard(); 
        })
        .catch(err => {
            console.error(err);
            if(btn) { 
                btn.innerText = "Error!"; 
                btn.style.background = "#dc3545"; 
                setTimeout(() => {
                    btn.innerText = "Save";
                    btn.style.background = "#0d6efd";
                    btn.disabled = false;
                }, 3000);
            }
            alert("Backend Failed to Save: " + err.message + "\n\nCheck your Laravel terminal for details!");
        });
    };

    function loadDashboard() {
        const token = localStorage.getItem('auth_token');
        const yearInput = document.getElementById("yearFilter");
        const year = yearInput ? yearInput.value : (new Date().getFullYear() + 1);
        const tbody = document.getElementById("tableBody");
        
        if(!tbody) return; 
        
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Refreshing...</td></tr>';

        Promise.all([
            fetch('http://127.0.0.1:8000/api/admin/sectors', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
            fetch(`http://127.0.0.1:8000/api/admin/budgets?year=${year}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
            fetch(`http://127.0.0.1:8000/api/admin/master-budget?year=${year}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
        ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([sectorsResp, budgetsResp, masterResp]) => {
            if (sectorsResp.message === "Unauthorized") {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                window.location.replace("index.html");
                return;
            }

            const dbMasterBudget = masterResp.total_amount ? parseFloat(masterResp.total_amount) : 0;
            const masterBudgetInput = document.getElementById("masterBudgetInput");
            if(masterBudgetInput) {
                masterBudgetInput.value = dbMasterBudget ? dbMasterBudget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '';
            }

            tbody.innerHTML = "";
            let grandTotal = 0;

            const sectorsData = Array.isArray(sectorsResp) ? sectorsResp : (sectorsResp.data || []);
            const budgetsData = Array.isArray(budgetsResp) ? budgetsResp : (budgetsResp.data || []);

            sectorsData.forEach(sector => {
                const sectorBudget = budgetsData.find(b => b.user_id === sector.id);
                const row = document.createElement("tr");

                if (sectorBudget) {
                    const amount = parseFloat(sectorBudget.allocated_amount);
                    grandTotal += amount;
                    const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    row.innerHTML = `
                        <td><strong>${sector.unit_name}</strong></td>
                        <td style="text-align: right; color: #198754; font-weight: 600;">₱ ${formattedAmount}</td>
                        <td style="text-align: center;">
                            <button class="btn-edit" onclick="openModal(${sector.id}, '${sector.unit_name}', ${amount})" style="background: none; border: 1px solid #ccc; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✏️ Edit</button>
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td><strong>${sector.unit_name}</strong></td>
                        <td style="text-align: right; color: #6c757d; font-style: italic;">Not yet allocated</td>
                        <td style="text-align: center;">
                            <button class="btn-allocate" onclick="openModal(${sector.id}, '${sector.unit_name}', '')" style="background: #0d6efd; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">➕ Allocate</button>
                        </td>
                    `;
                }
                tbody.appendChild(row);
            });

            // 🛑 SAVE THE MATH TO GLOBAL MEMORY
            window.currentAllocatedTotal = grandTotal;
            
            recalculateUnallocatedRealTime();

            const tfoot = document.getElementById("tableFooter");
            if (sectorsData.length > 0) {
                tfoot.style.display = "table-footer-group";
                document.getElementById("totalBudgetValue").innerText = "₱ " + grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                tfoot.style.display = "none";
            }
        })
        .catch(error => console.error("Error loading dashboard:", error));
    }

    // ==========================================
    // BUDGET MODAL LOGIC (With Over-Allocation Guard)
    // ==========================================
    let currentSectorId = null;
    let currentSectorOldAmount = 0;
    const modal = document.getElementById("budgetModal");

    window.openModal = function(sectorId, sectorName, currentAmount) {
        currentSectorId = sectorId;
        currentSectorOldAmount = parseFloat(currentAmount) || 0;

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
            const newAmount = parseFloat(amount) || 0;
            const year = document.getElementById("yearFilter").value;
            const errorMsg = document.getElementById("modalError");

            // ----------------------------------------
            // 🛑 OVER-ALLOCATION GUARD 🛑
            // ----------------------------------------
            const masterBudgetStr = document.getElementById("masterBudgetInput").value.replace(/[^0-9.-]/g, '');
            const masterBudget = parseFloat(masterBudgetStr) || 0;

            if (masterBudget <= 0) {
                errorMsg.innerText = "Error: Please set and save a Master Institution Budget first.";
                errorMsg.style.display = "block";
                return;
            }
            
            const availableBalance = masterBudget - (window.currentAllocatedTotal - currentSectorOldAmount);

            if (newAmount > currentSectorOldAmount && newAmount > availableBalance) {
                errorMsg.innerText = "Allocation Denied: The maximum you can assign to this specific sector is ₱" + availableBalance.toLocaleString(undefined, {minimumFractionDigits: 2}) + " (Unallocated Balance + their current budget).";
                errorMsg.style.display = "block";
                return;
            }
            // ----------------------------------------

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

        const yearInput = document.getElementById("ppmpYearFilter");
        const selectedYear = yearInput ? parseInt(yearInput.value) : (new Date().getFullYear());

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">Loading dashboard...</td></tr>';

        fetch('http://127.0.0.1:8000/api/admin/ppmps/all', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            tbody.innerHTML = ''; 

            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: #6c757d; font-style: italic;">No PPMPs have been submitted yet.</td></tr>`;
                return;
            }

            const filteredPpmps = data.data.filter(ppmp => parseInt(ppmp.fiscal_year) === selectedYear);

            if (filteredPpmps.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: #6c757d; font-style: italic;">No PPMPs found for Fiscal Year ${selectedYear}.</td></tr>`;
                return;
            }

            const groupedPpmps = {};
            filteredPpmps.forEach(ppmp => {
                const key = `${ppmp.user_id}_${ppmp.fiscal_year}`;
                if(!groupedPpmps[key]) groupedPpmps[key] = [];
                groupedPpmps[key].push(ppmp);
            });

            Object.values(groupedPpmps).forEach(group => {
                group.sort((a, b) => b.version - a.version);

                const latest = group[0];
                const olderRevisions = group.slice(1);
                
                const sectorName = latest.user ? latest.user.unit_name : 'Unknown Sector';
                const latestDateObj = new Date(latest.created_at);
                const latestNiceDate = latestDateObj.toLocaleDateString() + ' ' + latestDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                // Determine the Master Status and Action Button for the Latest Version
                let statusBadge = '';
                let actionBtn = '';

                // Assuming DB Statuses: 2=Pending, 3=Approved, 4=Rejected/Returned
                if (latest.status_id === 2) {
                    // Check if this is a pending revision of a PREVIOUSLY approved PPMP
                    let isRevisionOfApproved = false;
                    if (olderRevisions.length > 0 && olderRevisions[0].status_id === 3) {
                        isRevisionOfApproved = true;
                    }

                    if (isRevisionOfApproved) {
                        statusBadge = `<span style="background: #fd7e14; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #fff;">Pending (Revision)</span>`;
                    } else {
                        statusBadge = `<span style="background: #ffc107; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #000;">Pending Approval</span>`;
                    }
                    actionBtn = `<button onclick="reviewPpmp(${latest.id})" style="background-color: #0d6efd; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🔍 Review</button>`;
                
                } else if (latest.status_id === 3) {
                    statusBadge = `<span style="background: #198754; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #fff;">✅ Approved</span>`;
                    actionBtn = `<button onclick="viewOldPpmp(${latest.id})" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">👁️ View Latest</button>`;
                
                } else if (latest.status_id === 4) {
                    statusBadge = `<span style="background: #dc3545; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #fff;">❌ Returned</span>`;
                    actionBtn = `<button onclick="viewOldPpmp(${latest.id})" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">👁️ View Latest</button>`;
                }

                // Expand button for older revisions
                let expandBtn = '';
                if (olderRevisions.length > 0) {
                    expandBtn = `<br><button onclick="toggleRevisions('rev-${latest.id}')" style="background: none; border: none; color: #0d6efd; font-size: 0.8em; text-decoration: underline; cursor: pointer; padding: 0; margin-top: 5px;">[+] View ${olderRevisions.length} Older Revision(s)</button>`;
                }

                // Render Main Row
                const mainRow = document.createElement('tr');
                mainRow.style.borderBottom = olderRevisions.length > 0 ? "none" : "1px solid #eee";
                mainRow.style.background = "#fff";
                
                mainRow.innerHTML = `
                    <td style="padding: 15px;"><strong>${sectorName}</strong>${expandBtn}</td>
                    <td style="padding: 15px; font-weight: 600;">${latest.fiscal_year}</td>
                    <td style="padding: 15px;"><span style="background: #e9ecef; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold; color: #333;">v${latest.version} (Active)</span></td>
                    <td style="padding: 15px; color: #333;">${latestNiceDate}</td>
                    <td style="padding: 15px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 15px; text-align: center;">${actionBtn}</td>
                `;
                tbody.appendChild(mainRow);

                // Render Older Revisions (Strictly Read-Only)
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
                        <td style="padding: 10px 15px;"><span style="background: #e9ecef; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: #6c757d;">v${old.version}</span></td>
                        <td style="padding: 10px 15px; color: #6c757d; font-size: 0.9em;">${oldNiceDate}</td>
                        <td style="padding: 10px 15px; text-align: center;"><span style="color: #adb5bd; font-size: 0.85em; font-style: italic;">Archived</span></td>
                        <td style="padding: 10px 15px; text-align: center;">
                            <button onclick="viewOldPpmp(${old.id})" style="background-color: #6c757d; color: white; border: none; padding: 4px 10px; cursor: pointer; border-radius: 4px; font-size: 0.85em; font-weight: bold;">👁️ View Only</button>
                        </td>
                    `;
                    tbody.appendChild(oldRow);
                });
            });
        })
        .catch(error => console.error("Error fetching PPMPs:", error));
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
            
            // 1. Generate the <option> tags dynamically from our database array
            // Filter out the Draft status (ID 1) so the Admin cannot select it!
            let optionsHtml = window.ppmpStatuses
                .filter(s => s.id !== 1)
                .map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
            // 2. Build the new Control Panel UI
            footerEl.innerHTML = `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; width: 100%; text-align: left; border: 1px solid #dee2e6;">
                    <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;">Admin Decision Panel</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: 600; font-size: 0.9em; color: #555;">Set New Document Status:</label>
                        <select id="dynamicStatusSelect" style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 1em;">
                            ${optionsHtml}
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: 600; font-size: 0.9em; color: #555;">Admin Remarks (Notes for Sector):</label>
                        <textarea id="dynamicRemarksInput" rows="2" placeholder="Type specific notes, or reasons for returning the document..." style="width: 100%; padding: 10px; margin-top: 5px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
                    </div>
                    
                    <div style="text-align: right;">
                        <button onclick="submitDynamicDecision(${ppmpId})" style="background: #0d6efd; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 1em; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            💾 Save Status Update
                        </button>
                    </div>
                </div>
            `; 
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
    // INITIALIZE APP & FETCH GLOBALS
    // ==========================================
    window.ppmpStatuses = []; // Global array to hold the dynamic statuses

    window.fetchDynamicStatuses = function() {
        const token = localStorage.getItem('auth_token');
        fetch('http://127.0.0.1:8000/api/admin/ppmp-statuses', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                window.ppmpStatuses = data.data;
            }
        })
        .catch(error => console.error("Failed to load statuses:", error));
    };

    if (isLoggedInAdmin) {
        fetchDynamicStatuses(); // Grab statuses from the DB immediately
        loadDashboard();
    }

    // ==========================================
    // THE DYNAMIC DECISION ENGINE 
    // ==========================================

    window.submitDynamicDecision = function(id) {
        const statusId = document.getElementById('dynamicStatusSelect').value;
        const remarks = document.getElementById('dynamicRemarksInput').value;

        // Look up the name of the status they just selected
        const selectedStatus = window.ppmpStatuses.find(s => s.id == statusId);
        const statusName = selectedStatus ? selectedStatus.name : "Unknown Status";

        // Smart UX: If they choose a status with "Return" or "Reject" in the name, force them to type a reason!
        if (statusName.toLowerCase().includes('return') || statusName.toLowerCase().includes('reject')) {
            if (remarks.trim() === '') {
                alert(`You must provide remarks when setting the status to '${statusName}' so the Sector knows what to fix.`);
                return;
            }
        }

        // Final confirmation
        if(!confirm(`Are you sure you want to change this PPMP's status to: ${statusName}?`)) {
            return;
        }

        processDecision(id, statusId, remarks); 
    };

    function processDecision(id, statusId, remarks) {
        const token = localStorage.getItem('auth_token');
        
        fetch(`http://127.0.0.1:8000/api/admin/ppmps/${id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                status_id: statusId, 
                admin_remarks: remarks 
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success') {
                alert("Decision recorded successfully!");
                document.getElementById("reviewModal").style.display = "none"; // Close modal
                loadAdminPpmps(); // Refresh the table so the approved item vanishes!
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Submission Error:", error);
            alert("Failed to connect to the server.");
        });
    }

    // ==========================================
    // DATA MANAGEMENT ENGINE (TYPES ONLY)
    // ==========================================
    window.loadAdminDataTables = function() {
        const token = localStorage.getItem('auth_token');
        
        // Fetch Types
        fetch('http://127.0.0.1:8000/api/admin/ppmp-types', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => renderDataList('typesList', data.data, 'types'))
        .catch(err => console.error(err));
    };

    function renderDataList(elementId, items, tableType) {
        const ul = document.getElementById(elementId);
        if(!ul) return;
        ul.innerHTML = '';
        
        items.forEach(item => {
            const li = document.createElement('li');
            li.style.cssText = "display: flex; justify-content: space-between; background: white; padding: 10px; border: 1px solid #ddd; margin-bottom: 8px; border-radius: 4px; align-items: center;";
            
            const isActive = item.is_active !== 0 && item.is_active !== false; 
            const toggleColor = isActive ? '#dc3545' : '#198754';
            const toggleText = isActive ? '🚫 Disable' : '✅ Enable';
            const textStyle = isActive ? '' : 'text-decoration: line-through; color: #adb5bd;';
            
            // Toggle button is always active for Types
            const toggleBtnHtml = `<button onclick="toggleDataStatus('${tableType}', ${item.id})" style="background: ${toggleColor}; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: bold; margin-right: 5px;">${toggleText}</button>`;

            li.innerHTML = `
                <input type="text" id="edit_${tableType}_${item.id}" value="${item.name}" style="border: none; flex: 1; font-family: inherit; font-size: 0.95em; background: transparent; outline: none; ${textStyle}">
                <div>
                    ${toggleBtnHtml}
                    <button onclick="updateDataEntry('${tableType}', ${item.id})" style="background: #0d6efd; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">💾 Save</button>
                </div>
            `;
            ul.appendChild(li);
        });
    }

    window.saveDataEntry = function(tableType, inputId) {
        const token = localStorage.getItem('auth_token');
        const nameVal = document.getElementById(inputId).value.trim();
        if(!nameVal) return alert("Please enter a name.");

        fetch(`http://127.0.0.1:8000/api/admin/ppmp-${tableType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: nameVal })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                document.getElementById(inputId).value = '';
                loadAdminDataTables(); 
            } else {
                alert("Error saving.");
            }
        });
    };

    window.updateDataEntry = function(tableType, id) {
        const token = localStorage.getItem('auth_token');
        const nameVal = document.getElementById(`edit_${tableType}_${id}`).value.trim();
        
        fetch(`http://127.0.0.1:8000/api/admin/ppmp-${tableType}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: nameVal })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                alert('Successfully updated!');
            } else {
                alert('Error updating.');
            }
        });
    };

    window.toggleDataStatus = function(tableType, id) {
        const token = localStorage.getItem('auth_token');

        fetch(`http://127.0.0.1:8000/api/admin/ppmp-${tableType}/${id}/toggle`, {
            method: 'PATCH', 
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                loadAdminDataTables(); 
            } else {
                alert('Error toggling status.');
            }
        });
    };
});