document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ALLOW "ENTER" KEY FOR USER LOGIN
    // ==========================================
    const passwordInput = document.getElementById('passwordInput');
    const emailInput = document.getElementById('emailInput');

    function triggerUserLogin(event) {
        if (event.key === "Enter" || event.keyCode === 13) {
            event.preventDefault(); 
            document.getElementById('loginBtn').click(); 
        }
    }

    if (passwordInput) passwordInput.addEventListener("keydown", triggerUserLogin);
    if (emailInput) emailInput.addEventListener("keydown", triggerUserLogin);

    // ==========================================
    // MAIN LOGIN BUTTON CLICK LOGIC
    // ==========================================
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const emailInputEl = document.getElementById('emailInput');
            const passwordInputEl = document.getElementById('passwordInput');
            const messageDisplay = document.getElementById('loginMessage');

            const email = emailInputEl.value;
            const password = passwordInputEl.value;

            emailInputEl.disabled = true;
            passwordInputEl.disabled = true;
            loginBtn.disabled = true;
            loginBtn.style.cursor = "wait";

            messageDisplay.style.color = "blue";
            messageDisplay.innerText = "Authenticating...";

            fetch('http://127.0.0.1:8000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));

                    fetchDynamicTimeout();

                    if (data.user.role_id === 1) {
                        messageDisplay.style.color = "orange";
                        messageDisplay.innerText = "Redirecting to Admin Portal...";
                        window.location.href = "admin.html";
                        return;
                    }

                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('mainPpmpApp').style.display = 'block';
                    document.getElementById('welcomeUser').innerText = "Welcome, " + data.user.unit_name;
                    loadUserData(); 
                    fetchCurrentPpmp();
                } else {
                    messageDisplay.style.color = "red";
                    messageDisplay.innerText = data.message || "Login failed.";
                    
                    emailInputEl.disabled = false;
                    passwordInputEl.disabled = false;
                    loginBtn.disabled = false;
                    loginBtn.style.cursor = "pointer";
                }
            })
            .catch(error => { 
                console.error("Login error:", error); 
                messageDisplay.style.color = "red";
                messageDisplay.innerText = "Server connection failed. Check console.";
                
                emailInputEl.disabled = false;
                passwordInputEl.disabled = false;
                loginBtn.disabled = false;
                loginBtn.style.cursor = "pointer";
            });
        });
    }

    // ==========================================
    // FETCH DYNAMIC PPMP TYPES
    // ==========================================
    const ppmpTypeDropdown = document.getElementById("ppmpType");
    
    if (ppmpTypeDropdown) {
        fetch('http://127.0.0.1:8000/api/ppmp/types', {
            headers: { 'Accept': 'application/json' }
        })
        .then(response => response.json())
        .then(types => {
            ppmpTypeDropdown.innerHTML = ''; // Clear the "Loading..." text
            
            types.forEach(type => {
                if (type.is_active === 1 || type.is_active === true || type.is_active === undefined) {
                    const option = document.createElement("option");
                    option.value = type.id;
                    option.textContent = type.name;
                    
                    // Keep your "Indicative" default feature!
                    if (type.id === 1 || type.id === '1') {
                        option.selected = true;
                    }
                    
                    ppmpTypeDropdown.appendChild(option);
                }
            });
        })
        .catch(error => {
            console.error("Failed to load PPMP types:", error);
            ppmpTypeDropdown.innerHTML = '<option value="">Error loading types</option>';
        });
    }

    // ==========================================
    // DYNAMIC SECURE LOGOUT & IDLE TIMER
    // ==========================================
    let idleTimer;
    window.IDLE_TIMEOUT_MS = 300000;

    window.fetchDynamicTimeout = function() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetch('http://127.0.0.1:8000/api/settings/timeout', {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                if (data.timeout_ms) {
                    window.IDLE_TIMEOUT_MS = data.timeout_ms;
                    resetIdleTimer();
                }
            })
            .catch(error => console.error("Could not fetch timeout settings", error));
        }
    };

    fetchDynamicTimeout();

    // 1. The Master Logout Function
    function performSecureLogout(isTimeout = false) {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
            document.body.style.cursor = 'wait'; 
            
            fetch('http://127.0.0.1:8000/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }).finally(() => {
                document.body.style.cursor = 'default';
                localStorage.clear();
                
                if (isTimeout) {
                    alert("Security Timeout: You have been logged out due to inactivity.");
                }
                window.location.replace('index.html'); 
            });
        } else {
            localStorage.clear();
            if (window.location.pathname.includes('index.html')) {
                window.location.reload(); 
            }
        }
    }

    // 2. The Clock Reset Function
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        if (localStorage.getItem('auth_token')) {
            // USING THE GLOBAL DB VALUE HERE:
            idleTimer = setTimeout(() => performSecureLogout(true), window.IDLE_TIMEOUT_MS);
        }
    }

    // 3. Listen for Human Activity 
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetIdleTimer);
    });

    // 4. Attach to the Manual Logout Button
    document.addEventListener('click', function(e) {
        const clickedLogout = e.target.closest('#logoutBtn');
        if (clickedLogout) {
            e.preventDefault();
            performSecureLogout(false);
        }
    });

    // 5. Start the clock immediately when the page loads
    resetIdleTimer();

  const sectorInput = document.getElementById("sectorInput");
  const headUnitInput = document.getElementById("headUnit"); 
  const headDesignationInput = document.getElementById("headDesignation");

  function loadUserData() {
      const userDataStr = localStorage.getItem('user_data');
      
      if (!userDataStr) return;

      const user = JSON.parse(userDataStr);

      if (sectorInput) sectorInput.value = user.unit_name || 'N/A';
      if (headUnitInput) headUnitInput.value = user.unit_head || '';
      if (headDesignationInput) headDesignationInput.value = user.unit_designation || '';
  }

  const fiscalYear = document.getElementById("fiscalYear");
  if(fiscalYear) {
      fiscalYear.value = new Date().getFullYear(); 

      fiscalYear.addEventListener('change', () => {
          fetchCurrentPpmp();
      });
  }

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  if (startDateInput && endDateInput) {
      startDateInput.addEventListener('change', function() {
          if (!this.value) return; 

          const parts = this.value.split('-');
          let year = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);

          month += 1;

          if (month > 12) {
              month = 1;
              year += 1;
          }

          const nextMonthString = month.toString().padStart(2, '0');

          endDateInput.value = `${year}-${nextMonthString}`;
      });
  }

  const projects = [];
  let editIndex = null;
  let isLocked = false;
  let currentPpmpId = null;

  const tableBody = document.querySelector("#ppmpTable tbody");
  const totalBudgetEl = document.getElementById("totalBudget");
  const addBtn = document.getElementById("addProject");

    if(addBtn) {
        addBtn.addEventListener("click", () => {
            const isEditing = editIndex !== null;
            
            addBtn.disabled = true;
            addBtn.textContent = isEditing ? "⏳ Updating..." : "⏳ Adding...";
            addBtn.style.cursor = "wait";

            const unlockButton = () => {
                setTimeout(() => {
                    addBtn.disabled = false;
                    addBtn.style.cursor = "pointer";
                    if (addBtn.textContent === "⏳ Adding..." || addBtn.textContent === "⏳ Updating...") {
                        addBtn.textContent = "➕ Add Project";
                    }
                }, 1000); 
            };

            let rawBudget = document.getElementById("budget").value;
            let cleanBudget = rawBudget.replace(/,/g, '').replace(/[^0-9.]/g, '');

            const data = {
                description: document.getElementById("description").value.trim(),
                type: document.getElementById("type").value,
                quantity: document.getElementById("quantity").value.trim(),
                mode: document.getElementById("mode").value,
                preProc: document.getElementById("preProc").value,
                start: document.getElementById("startDate").value,
                end: document.getElementById("endDate").value,
                implementation: document.getElementById("implementation").value,
                source: document.getElementById("source").value,
                budget: parseFloat(cleanBudget) || 0,
                docs: document.getElementById("docs").value.trim(),
                remarks: document.getElementById("remarks").value.trim(),
            };

            if (!data.description || !data.quantity || !data.start || !data.end || data.budget <= 0) {
                showToast("Please fill in all required fields (Ensure Budget is greater than 0).", true);
                unlockButton(); 
                return;
            }

            if (isEditing) {
                projects[editIndex] = data;
                editIndex = null;
                showToast("Project successfully updated!", false);
            } else {
                projects.push(data);
                showToast("Project successfully added to the list!", false);
            }

            renderTable();
            document.getElementById("projectForm").reset();
            
            unlockButton();
        });
    }

  function renderTable() {
    if(!tableBody) return;
    tableBody.innerHTML = "";
    let total = 0;
    projects.forEach((p, i) => {
      total += p.budget;
      const row = document.createElement("tr");
      let rowHtml = `
          <td>${i + 1}</td>
          <td>${p.description}</td>
          <td>${p.type}</td>
          <td>${p.quantity}</td>
          <td>${p.mode}</td>
          <td>${p.preProc}</td>
          <td>${p.start}</td>
          <td>${p.end}</td>
          <td>${p.implementation}</td>
          <td>${p.source}</td>
          <td>${(parseFloat(p.budget) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>${p.docs}</td>
          <td>${p.remarks}</td>`;
            // INEDIT KO DITO YUNG p.budget para malagyan ng decimal
      if (!isLocked) {
          rowHtml += `<td>
            <button type="button" onclick="editProject(${i})">✏️</button>
            <button type="button" onclick="deleteProject(${i})">🗑️</button>
          </td>`;
      }
      
      row.innerHTML = rowHtml;
      tableBody.appendChild(row);
    });
    if(totalBudgetEl) {
        totalBudgetEl.textContent = total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
  }

  window.editProject = (index) => {
    const p = projects[index];
    document.getElementById("description").value = p.description;
    document.getElementById("type").value = p.type;
    document.getElementById("quantity").value = p.quantity;
    document.getElementById("mode").value = p.mode;
    document.getElementById("preProc").value = p.preProc;
    document.getElementById("startDate").value = p.start;
    document.getElementById("endDate").value = p.end;
    document.getElementById("implementation").value = p.implementation;
    document.getElementById("source").value = p.source;
    document.getElementById("budget").value = '₱ ' + p.budget.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})
    document.getElementById("docs").value = p.docs;
    document.getElementById("remarks").value = p.remarks;

    editIndex = index;
    if(addBtn) addBtn.textContent = "💾 Update Project";
  };

  window.deleteProject = (index) => {
    if (confirm("Are you sure you want to delete this project?")) {
      projects.splice(index, 1);
      renderTable();
    }
  };

  const exportBtn = document.getElementById("exportExcel");
  if(exportBtn) {
      exportBtn.onclick = () => {
        if (projects.length === 0) return alert("No projects to export.");
        const ws = XLSX.utils.json_to_sheet(projects);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PPMP Projects");
        XLSX.writeFile(wb, "PPMP_Projects.xlsx");
      };
  }

  const printBtn = document.getElementById("printPPMP");
  if(printBtn) {
      printBtn.onclick = () => {
        document.getElementById("headUnitName").textContent = document.getElementById("headUnit").value || "(Head of Sector)";
        document.getElementById("headUnitDesignation").textContent = document.getElementById("headDesignation").value || "";
        document.getElementById("footerDate").textContent = `Generated on ${new Date().toLocaleString()}`;
        
        const headerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="assets/tup_logo.png" width="80" height="80" style="margin-right:10px;">
                <div>
                <h2 style="margin:0;">Technological University of the Philippines - Manila</h2>
                <h3 style="margin:0;">Project Procurement Management Plan (PPMP)</h3>
                </div>
            </div><hr>`;

        const content = document.querySelector(".table-display").outerHTML + document.querySelector(".signature-container").outerHTML + document.querySelector("footer").outerHTML;

        const newWin = window.open("", "_blank");
        newWin.document.write(`
            <html><head><title>PPMP Print</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap" rel="stylesheet">
            <style>
              body { font-family:'Poppins',sans-serif;margin:20px; }
              table { width:100%;border-collapse:collapse; }
              th,td { border:1px solid #ccc;padding:6px;text-align:center; }
              .signature-container { display:flex;justify-content:space-around;margin-top:40px;text-align:center; }
            </style>
            </head><body>${headerHTML}${content}</body></html>`);
        newWin.document.close();
        newWin.print();
      };
  }

    // ==========================================
    // FETCH SECTOR PPMP & BUDGET ON LOGIN
    // ==========================================
    window.fetchCurrentPpmp = function() {
        const token = localStorage.getItem('auth_token');
        if(!token) return;

        const yearInput = document.getElementById("fiscalYear");
        const selectedYear = yearInput ? yearInput.value : (new Date().getFullYear());

        fetch(`http://127.0.0.1:8000/api/ppmp/current?year=${selectedYear}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.status === 401) {
                localStorage.clear();
                alert("Session Expired: Your account was logged into from another device.");
                window.location.replace("index.html");
                throw new Error("Token Invalidated");
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('uiAllocatedBudget').innerText = '₱' + parseFloat(data.allocated_budget || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

            const feedbackAlert = document.getElementById('adminFeedbackAlert');
            const feedbackText = document.getElementById('adminFeedbackText');

            if(data.status === 'empty') {
                document.getElementById('uiRemainingBudget').innerText = '₱' + parseFloat(data.allocated_budget || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                document.getElementById('uiPpmpStatus').innerText = 'Not Submitted';
                document.getElementById('uiPpmpStatus').style.color = '#dc3545'; 
                
                if (feedbackAlert) feedbackAlert.style.display = 'none';

                isLocked = false; 
                currentPpmpId = null;
                projects.length = 0; 
                
                const actionHeader = document.getElementById('actionHeader');
                if(actionHeader) actionHeader.style.display = ''; 
                
                const typeDropdown = document.getElementById('ppmpType');
                if(typeDropdown) {
                    typeDropdown.disabled = false;
                    typeDropdown.style.background = ""; 
                }

                const reviseBtn = document.getElementById('reviseBtn');
                if(reviseBtn) reviseBtn.style.display = 'none';
                
                const formSection = document.querySelector('.form-section');
                if(formSection) formSection.style.display = 'block';

                const submitBtn = document.getElementById("submitToDatabase");
                if(submitBtn) {
                    submitBtn.innerText = "🚀 Submit to Database";
                    submitBtn.disabled = false;
                    submitBtn.style.background = "";
                }
                
                const draftBtn = document.getElementById("saveDraftBtn");
                if (draftBtn) {
                    draftBtn.innerText = "📝 Save as Draft";
                    draftBtn.style.display = "inline-block";
                }

                renderTable();

            } else if (data.status === 'success') {
                document.getElementById('uiRemainingBudget').innerText = '₱' + (data.remaining_budget || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
                document.getElementById('uiPpmpStatus').innerText = data.current_status;
                
                if (data.data.status_id === 4 && data.data.admin_remarks) {
                    document.getElementById('uiPpmpStatus').style.color = '#dc3545';
                    if (feedbackAlert && feedbackText) {
                        feedbackText.innerText = `"${data.data.admin_remarks}"`;
                        feedbackAlert.style.display = 'block';
                    }
                } else {
                    document.getElementById('uiPpmpStatus').style.color = '#f39c12';
                    if (feedbackAlert) feedbackAlert.style.display = 'none';
                    if (data.data.status_id === 3) {
                         document.getElementById('uiPpmpStatus').style.color = '#198754';
                    }
                }

                projects.length = 0; 
                data.data.items.forEach(item => {
                    projects.push({
                        description: item.description,
                        type: item.type,
                        quantity: item.quantity,
                        mode: item.mode_of_procurement,
                        preProc: item.pre_proc_conference || item.pre_procurement_conference, 
                        start: item.start_date.substring(0, 7), 
                        end: item.end_date.substring(0, 7),
                        implementation: item.implementation_period,
                        source: item.source_of_funds,
                        budget: parseFloat(item.estimated_budget),
                        docs: item.supporting_docs || '',
                        remarks: item.remarks || ''
                    });
                });

                currentPpmpId = data.data.id;
                
                const actionHeader = document.getElementById('actionHeader');
                const typeDropdown = document.getElementById("ppmpType");
                const submitBtn = document.getElementById("submitToDatabase");
                const draftBtn = document.getElementById("saveDraftBtn");
                const formSection = document.querySelector('.form-section');
                const reviseBtn = document.getElementById('reviseBtn');

                // --- NEW DRAFT CHECK LOGIC ---
                if (data.data.status_id === 1) { // 1 = DRAFT
                    isLocked = false; 
                    document.getElementById('uiPpmpStatus').style.color = '#6c757d'; // Gray for draft
                    
                    if(actionHeader) actionHeader.style.display = ''; 
                    if(formSection) formSection.style.display = 'block';
                    
                    if(typeDropdown) {
                        typeDropdown.value = data.data.ppmp_type_id; 
                        typeDropdown.disabled = false;
                        typeDropdown.style.background = ""; 
                    }
                    if(submitBtn) {
                        submitBtn.innerText = "🚀 Submit for Approval";
                        submitBtn.disabled = false;
                        submitBtn.style.background = "";
                    }
                    if(draftBtn) {
                        draftBtn.innerText = "💾 Update Draft";
                        draftBtn.style.display = "inline-block";
                    }
                    if(reviseBtn) reviseBtn.style.display = 'none';

                } else {
                    // It is Pending, Approved, or Returned -> LOCK THE UI!
                    isLocked = true; 
                    if(actionHeader) actionHeader.style.display = 'none'; 
                    if(formSection) formSection.style.display = 'none';
                    if(draftBtn) draftBtn.style.display = 'none';
                    if(reviseBtn) reviseBtn.style.display = 'inline-block';
                    
                    if(typeDropdown) {
                        typeDropdown.value = data.data.ppmp_type_id; 
                        typeDropdown.disabled = true;
                        typeDropdown.style.background = "#e9ecef"; 
                    }
                    if(submitBtn) {
                        submitBtn.innerText = "🔒 PPMP Submitted";
                        submitBtn.disabled = true;
                        submitBtn.style.background = "#6c757d";
                    }
                }

                renderTable();

                const yearDropdown = document.getElementById("fiscalYear");
                if(yearDropdown) yearDropdown.value = data.data.fiscal_year;
            }
        })
        .catch(error => {
            console.error("Error fetching PPMP:", error);
            document.getElementById('uiPpmpStatus').innerText = "Connection Error";
            document.getElementById('uiPpmpStatus').style.color = "red";
        });
    };

    // ==========================================
    // UNLOCK DASHBOARD FOR REVISIONS
    // ==========================================
    const reviseBtn = document.getElementById('reviseBtn');
    if (reviseBtn) {
        reviseBtn.addEventListener('click', () => {
            isLocked = false;

            const actionHeader = document.getElementById('actionHeader');
            if(actionHeader) actionHeader.style.display = ''; 

            const typeDropdown = document.getElementById('ppmpType');
            if(typeDropdown) {
                typeDropdown.disabled = false;
                typeDropdown.style.background = ""; 
            }

            const formSection = document.querySelector('.form-section');
            if(formSection) formSection.style.display = 'block';

            const submitBtn = document.getElementById("submitToDatabase");
            if(submitBtn) {
                submitBtn.innerText = "🚀 Submit Revision (v2)";
                submitBtn.disabled = false;
                submitBtn.style.background = "";
            }

            reviseBtn.style.display = 'none';

            renderTable();
        });
    }

    // ==========================================
    // UNIFIED SAVE / SUBMIT LOGIC
    // ==========================================
    function savePpmpToDatabase(targetStatusId, btnElement, defaultText) {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            alert("Security Error: You must be logged in to submit.");
            return;
        }

        if (projects.length === 0) {
            return alert("Please add at least one project before saving.");
        }

        const formattedProjects = projects.map(p => ({
            ...p,
            estimated_budget: p.budget
        }));

        const payload = {
            fiscal_year: document.getElementById("fiscalYear").value,
            ppmp_type_id: document.getElementById("ppmpType").value,
            parent_id: currentPpmpId,
            status_id: targetStatusId, 
            items: formattedProjects
        };

        btnElement.innerText = "Saving...";
        btnElement.disabled = true;

        fetch('http://127.0.0.1:8000/api/ppmp/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (response.status === 401) {
                btnElement.innerText = defaultText;
                btnElement.disabled = false;
                localStorage.clear();
                alert("Session Expired: Your account was logged into from another device.");
                window.location.replace("index.html");
                throw new Error("Token Invalidated");
            }
            return response.json();
        })
        .then(data => {
            btnElement.innerText = defaultText;
            btnElement.disabled = false;
            
            if(data.status === 'success') {
                alert(targetStatusId === 1 ? "Draft successfully saved!" : "PPMP Successfully Submitted for Approval!");
                fetchCurrentPpmp();
            } else {
                alert("Error saving: " + (data.message || "Please check your inputs."));
            }
        })
        .catch(error => {
            if (error.message !== "Token Invalidated") {
                console.error("Submission Error:", error);
                btnElement.innerText = defaultText;
                btnElement.disabled = false;
                alert("Failed to connect to the server.");
            }
        });
    }

    // Bind the unified function to both buttons
    const submitBtn = document.getElementById("submitToDatabase");
    const draftBtn = document.getElementById("saveDraftBtn");

    if (submitBtn) submitBtn.onclick = () => savePpmpToDatabase(2, submitBtn, "🚀 Submit to Database"); // ID 2 = Pending
    if (draftBtn) draftBtn.onclick = () => savePpmpToDatabase(1, draftBtn, "📝 Save as Draft"); // ID 1 = Draft

    // ==========================================
    // USER ROUTE GUARD (Persist Login on Refresh)
    // ==========================================
    if (localStorage.getItem('auth_token')) {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            const user = JSON.parse(userDataStr);
            
            // If an Admin accidentally loads index.html, safely route them away
            if (user.role_id === 1) {
                window.location.replace("admin.html"); 
            } else {
                // If it's a Sector User, hide the login screen and load their dashboard!
                const loginSec = document.getElementById('loginSection');
                const appSec = document.getElementById('mainPpmpApp');
                
                if(loginSec) loginSec.style.display = 'none';
                if(appSec) appSec.style.display = 'block';
                
                const welcomeObj = document.getElementById('welcomeUser');
                if(welcomeObj) welcomeObj.innerText = "Welcome, " + (user.unit_name || "");
                
                loadUserData();
                fetchCurrentPpmp();
            }
        }
    }

    function showToast(message, isError = false) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        if (isError) {
            toast.style.background = '#dc3545';
        }
        
        toast.innerHTML = `<span>${isError ? '⚠️' : '✨'}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // ==========================================
    // PASSWORD VISIBILITY TOGGLES (Bootstrap Icons)
    // ==========================================
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('passwordInput');

    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function () {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>'; 
        });
    }

    // BUDGET INPUT AUTO COMMA

    const budgetInput = document.getElementById("budget");
    
    if (budgetInput) {
        budgetInput.addEventListener("input", function() {
            let value = this.value.replace(/[^0-9.]/g, "");
            
            const parts = value.split(".");
            let intPart = parts[0];
            let decPart = parts.length > 1 ? "." + parts.slice(1).join("") : "";
            
            intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            
            this.value = intPart + decPart;
        });
    }
});