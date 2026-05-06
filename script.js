document.addEventListener("DOMContentLoaded", () => {
  
  if (localStorage.getItem('auth_token')) {
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
          const user = JSON.parse(userDataStr);
          if (user.role_id === 1) {
              localStorage.clear();
              window.location.replace("admin.html"); 
          } else {
              document.getElementById('loginSection').style.display = 'none';
              document.getElementById('mainPpmpApp').style.display = 'block';
              document.getElementById('welcomeUser').innerText = "Welcome, " + (user.unit_name || "");
              loadUserData();
          }
      }
  }

  document.getElementById('loginBtn').addEventListener('click', function() {
      const email = document.getElementById('emailInput').value;
      const password = document.getElementById('passwordInput').value;
      const messageDisplay = document.getElementById('loginMessage');

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
                if (data.user.role_id === 1) {
                    messageDisplay.style.color = "orange";
                    messageDisplay.innerText = "Redirecting to Admin Portal...";
                    window.location.href = "admin.html";
                    return;
                }

                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('mainPpmpApp').style.display = 'block';
                document.getElementById('welcomeUser').innerText = "Welcome, " + data.user.unit_name;
                loadUserData(); 
            } else {
                messageDisplay.style.color = "red";
                messageDisplay.innerText = data.message || "Login failed.";
            }
        })
        .catch(error => { console.error("Login error:", error); });
  });

 
 document.addEventListener('click', function(e) {
     const clickedLogout = e.target.closest('#logoutBtn');
    
     if (clickedLogout) {
         localStorage.clear();
         window.location.replace('index.html');
     }
 });
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

  if (localStorage.getItem('auth_token')) {
      loadUserData();
  }

  const fiscalYear = document.getElementById("fiscalYear");
  if(fiscalYear) fiscalYear.value = new Date().getFullYear() + 1; 

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

  const tableBody = document.querySelector("#ppmpTable tbody");
  const totalBudgetEl = document.getElementById("totalBudget");
  const addBtn = document.getElementById("addProject");

  if(addBtn) {
      addBtn.addEventListener("click", () => {
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
          budget: parseFloat(document.getElementById("budget").value) || 0,
          docs: document.getElementById("docs").value.trim(),
          remarks: document.getElementById("remarks").value.trim(),
        };

        if (!data.description) return alert("Please fill in all required fields.");

        if (editIndex !== null) {
          projects[editIndex] = data;
          editIndex = null;
          addBtn.textContent = "➕ Add Project";
        } else {
          projects.push(data);
        }

        renderTable();
        document.getElementById("projectForm").reset();
      });
  }

  function renderTable() {
    if(!tableBody) return;
    tableBody.innerHTML = "";
    let total = 0;
    projects.forEach((p, i) => {
      total += p.budget;
      const row = document.createElement("tr");
      row.innerHTML = `
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
          <td>${p.budget.toLocaleString()}</td>
          <td>${p.docs}</td>
          <td>${p.remarks}</td>
          <td>
            <button type="button" onclick="editProject(${i})">✏️</button>
            <button type="button" onclick="deleteProject(${i})">🗑️</button>
          </td>`;
      tableBody.appendChild(row);
    });
    if(totalBudgetEl) totalBudgetEl.textContent = total.toLocaleString();
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
    document.getElementById("budget").value = p.budget;
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

  const submitBtn = document.getElementById("submitToDatabase");
  if(submitBtn) {
      submitBtn.onclick = () => {
          const token = localStorage.getItem('auth_token');
          
          if (!token) {
              alert("Security Error: You must be logged in to submit.");
              document.getElementById('mainPpmpApp').style.display = 'none';
              document.getElementById('loginSection').style.display = 'flex';
              return;
          }

          if (projects.length === 0) {
              return alert("Please add at least one project before submitting.");
          }

          const payload = {
              fiscal_year: document.getElementById("fiscalYear").value,
              is_indicative: document.getElementById("indicative").checked,
              is_final: document.getElementById("final").checked,
              items: projects 
          };

          const btn = document.getElementById("submitToDatabase");
          btn.innerText = "Submitting...";
          btn.disabled = true;

          fetch('http://127.0.0.1:8000/api/ppmp/submit', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(payload)
          })
          .then(response => response.json())
          .then(data => {
              btn.innerText = "🚀 Submit to Database";
              btn.disabled = false;
              
              if(data.status === 'success') {
                  alert("PPMP Successfully Saved to the Database!");
              } else {
                  alert("Error saving: " + (data.message || "Unknown error"));
              }
          })
          .catch(error => {
              console.error("Submission Error:", error);
              btn.innerText = "🚀 Submit to Database";
              btn.disabled = false;
              alert("Failed to connect to the server.");
          });
      };
  }
});