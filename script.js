document.addEventListener("DOMContentLoaded", () => {
  const fiscalYear = document.getElementById("fiscalYear");
  fiscalYear.value = new Date().getFullYear() + 1; // ✅ Auto next year
  // Set up the date pickers to start next year by default
  const nextYear = new Date().getFullYear() + 1;
  flatpickr(".month-picker", {
    dateFormat: "m/Y",
    defaultDate: `01/01/${nextYear}`, // always starts at next year
  });

  const projects = [];
  let editIndex = null; // track if we are editing a project

  const tableBody = document.querySelector("#ppmpTable tbody");
  const totalBudgetEl = document.getElementById("totalBudget");
  const addBtn = document.getElementById("addProject");

  // Add or Update project
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
      // ✅ Update existing project
      projects[editIndex] = data;
      editIndex = null;
      addBtn.textContent = "➕ Add Project";
    } else {
      // ✅ Add new project
      projects.push(data);
    }

    renderTable();
    document.getElementById("projectForm").reset();
  });

  function renderTable() {
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
            <button onclick="editProject(${i})">✏️</button>
            <button onclick="deleteProject(${i})">🗑️</button>
          </td>`;
      tableBody.appendChild(row);
    });
    totalBudgetEl.textContent = total.toLocaleString();
  }

  // ✅ Edit Project Function
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
    addBtn.textContent = "💾 Update Project";
  };

  // ✅ Delete Project Function
  window.deleteProject = (index) => {
    if (confirm("Are you sure you want to delete this project?")) {
      projects.splice(index, 1);
      renderTable();
    }
  };

  // ✅ Export to Excel / CSV
  document.getElementById("exportExcel").onclick = () => {
    if (projects.length === 0) return alert("No projects to export.");
    const ws = XLSX.utils.json_to_sheet(projects);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PPMP Projects");
    XLSX.writeFile(wb, "PPMP_Projects.xlsx");
  };

  // ✅ Print or Save as PDF
  document.getElementById("printPPMP").onclick = () => {
    document.getElementById("endUserName").textContent =
      document.getElementById("unit").value || "(End-User / Implementing Unit)";
    document.getElementById("endUserDesignation").textContent =
      document.getElementById("unitDesignation").value || "";
    document.getElementById("headUnitName").textContent =
      document.getElementById("headUnit").value ||
      "(Head of Implementing Unit / Sector)";
    document.getElementById("headUnitDesignation").textContent =
      document.getElementById("headDesignation").value || "";
    document.getElementById(
      "footerDate"
    ).textContent = `Generated on ${new Date().toLocaleString()}`;

    const logoPath = "assets/tup_logo.png";
    const officeName = document.getElementById("office").value || "";

    const headerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <img src="${
              assets / tup_logo.png
            }" width="80" height="80" style="margin-right:10px;">
            <div>
            <h2 style="margin:0;">Technological University of the Philippines - Manila</h2>
            <h3 style="margin:0;">Project Procurement Management Plan (PPMP)</h3>
            <h3 style="margin:0;font-size:14px;">Office: ${officeName}</h3>
            </div>
        </div><hr>`;

    /*
    const headerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${logoPath}" width="80" height="80" style="margin-right:10px;">
          <div>
            <h2 style="margin:0;">Technological University of the Philippines - Manila</h2>
            <h3 style="margin:0;">Project Procurement Management Plan (PPMP)</h3>
          </div>
        </div><hr>`;
    */

    const content =
      document.querySelector(".table-display").outerHTML +
      document.querySelector(".signature-container").outerHTML +
      document.querySelector("footer").outerHTML;

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
});
