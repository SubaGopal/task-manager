const API_BASE = "http://localhost:8080/api/tasks";

const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

// Subtask Form Elements
const newSubtaskInput = document.getElementById("new-subtask-input");
const addSubtaskBtn = document.getElementById("add-subtask-btn");
const formSubtaskList = document.getElementById("form-subtask-list");
let currentFormSubtasks = [];

// Controls & Views
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const sortBySelect = document.getElementById("sort-by");
const taskList = document.getElementById("task-list");
const kanbanBoard = document.getElementById("kanban-board");
const calendarView = document.getElementById("calendar-view");
const viewListBtn = document.getElementById("view-list-btn");
const viewKanbanBtn = document.getElementById("view-kanban-btn");
const viewCalendarBtn = document.getElementById("view-calendar-btn");
const exportBtn = document.getElementById("export-btn");

const loadingEl = document.getElementById("loading");
const toastEl = document.getElementById("toast");
const themeToggle = document.getElementById("theme-toggle");

// Modal Elements
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const closeModalBtn = document.getElementById("close-modal-btn");

// Stats Elements
const statTotal = document.getElementById("stat-total");
const statPending = document.getElementById("stat-pending");
const statCompleted = document.getElementById("stat-completed");
const statOverdue = document.getElementById("stat-overdue");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");

// Kanban Column Containers
const cardsTodo = document.getElementById("cards-todo");
const cardsFocus = document.getElementById("cards-focus");
const cardsDone = document.getElementById("cards-done");
const countTodo = document.getElementById("count-todo");
const countFocus = document.getElementById("count-focus");
const countDone = document.getElementById("count-done");

// Calendar Elements
const calendarMonthYear = document.getElementById("calendar-month-year");
const calendarGridDays = document.getElementById("calendar-grid-days");
const calPrevBtn = document.getElementById("cal-prev");
const calTodayBtn = document.getElementById("cal-today");
const calNextBtn = document.getElementById("cal-next");
let currentCalDate = new Date();

let allTasksData = [];
let currentView = "list";
let searchTimeout;

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initViewMode();
  initKeyboardShortcuts();
  initCalendarNav();
  loadTasks();
  setupEventListeners();
});

// Smart Quick Date Setter
function setQuickDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  dueDateInput.value = `${year}-${month}-${day}`;
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem("app-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  themeToggle.addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const nextTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", nextTheme);
  themeToggle.textContent = nextTheme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("app-theme", nextTheme);
}

// 3-Way View Mode (List / Kanban / Calendar)
function initViewMode() {
  currentView = localStorage.getItem("app-view") || "list";
  switchView(currentView);

  viewListBtn.addEventListener("click", () => switchView("list"));
  viewKanbanBtn.addEventListener("click", () => switchView("kanban"));
  viewCalendarBtn.addEventListener("click", () => switchView("calendar"));
}

function switchView(view) {
  currentView = view;
  localStorage.setItem("app-view", view);

  viewListBtn.classList.remove("active");
  viewKanbanBtn.classList.remove("active");
  viewCalendarBtn.classList.remove("active");
  taskList.classList.add("hidden");
  kanbanBoard.classList.add("hidden");
  calendarView.classList.add("hidden");

  if (view === "kanban") {
    viewKanbanBtn.classList.add("active");
    kanbanBoard.classList.remove("hidden");
  } else if (view === "calendar") {
    viewCalendarBtn.classList.add("active");
    calendarView.classList.remove("hidden");
    renderCalendar(allTasksData);
  } else {
    viewListBtn.classList.add("active");
    taskList.classList.remove("hidden");
  }
}

// Calendar Navigation
function initCalendarNav() {
  calPrevBtn.addEventListener("click", () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(allTasksData);
  });
  calNextBtn.addEventListener("click", () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(allTasksData);
  });
  calTodayBtn.addEventListener("click", () => {
    currentCalDate = new Date();
    renderCalendar(allTasksData);
  });
}

function renderCalendar(tasks) {
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  calendarGridDays.innerHTML = "";
  const todayStr = new Date().toISOString().slice(0, 10);

  // Previous month trailing days
  for (let x = firstDayIndex; x > 0; x--) {
    const dayNum = prevMonthTotalDays - x + 1;
    calendarGridDays.appendChild(createCalCell(dayNum, true));
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const isToday = dayStr === todayStr;

    const cell = document.createElement("div");
    cell.className = `cal-day-cell ${isToday ? "today" : ""}`;
    cell.innerHTML = `<span class="cal-date-number">${i}</span>`;

    const dayTasks = tasks.filter(t => t.dueDate === dayStr);
    dayTasks.forEach(task => {
      const pill = document.createElement("div");
      const isDone = task.status === "COMPLETED";
      const cat = (task.category || "PERSONAL").toLowerCase();
      pill.className = `cal-task-pill cat-${cat} ${isDone ? "completed" : ""}`;
      pill.textContent = (isDone ? "✓ " : "") + task.title;
      pill.title = `${task.title} (${task.priority})`;
      pill.onclick = () => editTask(task.id);
      cell.appendChild(pill);
    });

    calendarGridDays.appendChild(cell);
  }
}

function createCalCell(num, isOtherMonth) {
  const cell = document.createElement("div");
  cell.className = `cal-day-cell ${isOtherMonth ? "other-month" : ""}`;
  cell.innerHTML = `<span class="cal-date-number">${num}</span>`;
  return cell;
}

// Keyboard Shortcuts
function initKeyboardShortcuts() {
  shortcutsBtn.addEventListener("click", () => shortcutsModal.classList.remove("hidden"));
  closeModalBtn.addEventListener("click", () => shortcutsModal.classList.add("hidden"));
  shortcutsModal.addEventListener("click", (e) => {
    if (e.target === shortcutsModal) shortcutsModal.classList.add("hidden");
  });

  document.addEventListener("keydown", (e) => {
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);

    if (e.key === "Escape") {
      shortcutsModal.classList.add("hidden");
      resetForm();
      document.activeElement.blur();
      return;
    }

    if (isTyping) return;

    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      titleInput.focus();
    } else if (e.key === "/" || e.key === "f" || e.key === "F") {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "v" || e.key === "V") {
      e.preventDefault();
      const views = ["list", "kanban", "calendar"];
      const nextIdx = (views.indexOf(currentView) + 1) % views.length;
      switchView(views[nextIdx]);
    } else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      toggleTheme();
    }
  });
}

// Confetti Celebration
function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2 + 100,
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
      gravity: 0.4,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.015
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        active = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    if (active) requestAnimationFrame(render);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  render();
}

function setupEventListeners() {
  taskForm.addEventListener("submit", handleFormSubmit);
  cancelBtn.addEventListener("click", resetForm);

  addSubtaskBtn.addEventListener("click", addSubtaskToForm);
  newSubtaskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubtaskToForm();
    }
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTasks, 300);
  });

  filterCategory.addEventListener("change", loadTasks);
  filterStatus.addEventListener("change", loadTasks);
  filterPriority.addEventListener("change", loadTasks);
  sortBySelect.addEventListener("change", loadTasks);
  exportBtn.addEventListener("click", exportTasksToCSV);

  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("click", () => {
      const filter = card.dataset.filter;
      if (filter === "ALL") filterStatus.value = "";
      else if (filter === "PENDING" || filter === "COMPLETED") filterStatus.value = filter;
      loadTasks();
    });
  });
}

function addSubtaskToForm() {
  const text = newSubtaskInput.value.trim();
  if (!text) return;
  currentFormSubtasks.push({ title: text, done: false });
  newSubtaskInput.value = "";
  renderFormSubtasks();
}

function removeSubtaskFromForm(index) {
  currentFormSubtasks.splice(index, 1);
  renderFormSubtasks();
}

function renderFormSubtasks() {
  formSubtaskList.innerHTML = currentFormSubtasks.map((st, i) => `
    <li class="form-subtask-item">
      <span>• ${escapeHtml(st.title)}</span>
      <button type="button" class="btn-remove-subtask" onclick="removeSubtaskFromForm(${i})">×</button>
    </li>
  `).join("");
}

async function loadTasks() {
  loadingEl.classList.remove("hidden");

  const params = new URLSearchParams();
  if (filterCategory.value) params.append("category", filterCategory.value);
  if (filterStatus.value) params.append("status", filterStatus.value);
  if (filterPriority.value) params.append("priority", filterPriority.value);
  if (searchInput.value.trim()) params.append("search", searchInput.value.trim());

  const [sortBy, direction] = sortBySelect.value.split("-");
  params.append("sortBy", sortBy);
  params.append("direction", direction);

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load tasks");
    const tasks = await res.json();
    allTasksData = tasks;
    updateAnalytics(tasks);
    renderTasks(tasks);
    renderKanban(tasks);
    if (currentView === "calendar") renderCalendar(tasks);
  } catch (error) {
    showToast("Server connection error", "error");
    taskList.innerHTML = `<div class="empty-state">Unable to load tasks from server.</div>`;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function updateAnalytics(tasks) {
  const now = new Date();
  now.setHours(0,0,0,0);

  const total = tasks.length;
  let completed = 0;
  let pending = 0;
  let overdue = 0;

  tasks.forEach(t => {
    if (t.status === "COMPLETED") {
      completed++;
    } else {
      pending++;
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        d.setHours(0,0,0,0);
        if (d < now) overdue++;
      }
    }
  });

  statTotal.textContent = total;
  statPending.textContent = pending;
  statCompleted.textContent = completed;
  statOverdue.textContent = overdue;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressText.textContent = `${percent}% Completed`;
  progressFill.style.width = `${percent}%`;
}

const categoryIcons = {
  WORK: "💼 Work",
  PERSONAL: "🏠 Personal",
  STUDY: "📚 Study",
  HEALTH: "🏃 Health",
  FINANCE: "💰 Finance",
  OTHER: "🔖 Other"
};

function renderTasks(tasks) {
  if (tasks.length === 0) {
    taskList.innerHTML = `<div class="empty-state"><p>No tasks found.</p><small>Create one using the form on the left!</small></div>`;
    return;
  }

  const now = new Date();
  now.setHours(0,0,0,0);

  taskList.innerHTML = tasks.map(task => {
    const isCompleted = task.status === "COMPLETED";
    const cat = task.category || "PERSONAL";
    const catLabel = categoryIcons[cat] || cat;

    let isOverdue = false;
    let formattedDate = "No due date";

    if (task.dueDate) {
      const d = new Date(task.dueDate);
      formattedDate = d.toLocaleDateString();
      d.setHours(0,0,0,0);
      if (!isCompleted && d < now) isOverdue = true;
    }

    let subtasks = [];
    try {
      if (task.subtasks) subtasks = JSON.parse(task.subtasks);
    } catch(e) {}

    const totalSub = subtasks.length;
    const doneSub = subtasks.filter(s => s.done).length;
    const subPercent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

    const subtasksHtml = totalSub > 0 ? `
      <div class="card-subtasks">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:2px;">
          <span>Checklist (${doneSub}/${totalSub})</span>
          <span>${subPercent}%</span>
        </div>
        <div class="subtasks-progress-bar">
          <div class="subtasks-progress-fill" style="width:${subPercent}%;"></div>
        </div>
        ${subtasks.map((st, idx) => `
          <div class="subtask-card-row ${st.done ? "done" : ""}">
            <input type="checkbox" ${st.done ? "checked" : ""} 
                   onchange="toggleSubtaskDone(${task.id}, ${idx}, this.checked)">
            <span>${escapeHtml(st.title)}</span>
          </div>
        `).join("")}
      </div>
    ` : "";

    return `
      <div class="task-item ${isCompleted ? "completed" : ""} ${isOverdue ? "is-overdue" : ""}">
        <div class="task-left">
          <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""} 
                 onchange="toggleTaskStatus(${task.id}, this.checked)">
          <div class="task-details">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
            <div class="task-meta">
              <span class="badge-cat cat-${cat.toLowerCase()}">${catLabel}</span>
              <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
              <span class="due-date">📅 ${formattedDate}</span>
              ${isOverdue ? `<span class="badge badge-overdue">🚨 OVERDUE</span>` : ""}
            </div>
            ${subtasksHtml}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-sm" onclick="editTask(${task.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete(${task.id})">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderKanban(tasks) {
  const todoList = tasks.filter(t => t.status === "PENDING" && t.priority !== "HIGH");
  const focusList = tasks.filter(t => t.status === "PENDING" && t.priority === "HIGH");
  const doneList = tasks.filter(t => t.status === "COMPLETED");

  countTodo.textContent = todoList.length;
  countFocus.textContent = focusList.length;
  countDone.textContent = doneList.length;

  cardsTodo.innerHTML = todoList.map(t => renderKanbanCard(t, "todo")).join("");
  cardsFocus.innerHTML = focusList.map(t => renderKanbanCard(t, "focus")).join("");
  cardsDone.innerHTML = doneList.map(t => renderKanbanCard(t, "done")).join("");
}

function renderKanbanCard(task, colType) {
  const cat = task.category || "PERSONAL";
  const catLabel = categoryIcons[cat] || cat;
  const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "";

  let actionBtns = "";
  if (colType === "todo" || colType === "focus") {
    actionBtns = `<button class="btn btn-primary btn-sm" onclick="toggleTaskStatus(${task.id}, true)" title="Mark Done">✓ Complete</button>`;
  } else {
    actionBtns = `<button class="btn btn-secondary btn-sm" onclick="toggleTaskStatus(${task.id}, false)" title="Move to Pending">↺ Reopen</button>`;
  }

  return `
    <div class="kanban-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge-cat cat-${cat.toLowerCase()}">${catLabel}</span>
        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
      <h4 class="kanban-card-title">${escapeHtml(task.title)}</h4>
      ${task.description ? `<p class="kanban-card-desc">${escapeHtml(task.description)}</p>` : ""}
      <div class="kanban-card-footer">
        <span class="due-date" style="font-size:0.75rem;">${formattedDate ? "📅 " + formattedDate : ""}</span>
        <div style="display:flex; gap:4px;">
          ${actionBtns}
          <button class="btn btn-danger btn-sm" onclick="confirmDelete(${task.id})">×</button>
        </div>
      </div>
    </div>
  `;
}

function exportTasksToCSV() {
  if (allTasksData.length === 0) {
    showToast("No tasks available to export", "error");
    return;
  }

  const headers = ["ID", "Title", "Description", "Category", "Priority", "Status", "DueDate", "CreatedAt"];
  const rows = allTasksData.map(t => [
    t.id,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    `"${(t.description || "").replace(/"/g, '""')}"`,
    t.category,
    t.priority,
    t.status,
    t.dueDate || "",
    t.createdAt || ""
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `tasks_backup_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Tasks exported to CSV successfully!", "success");
}

async function toggleSubtaskDone(taskId, subtaskIdx, isDone) {
  const task = allTasksData.find(t => t.id === taskId);
  if (!task) return;

  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks || "[]"); } catch(e) {}

  if (subtasks[subtaskIdx]) subtasks[subtaskIdx].done = isDone;
  const allDone = subtasks.length > 0 && subtasks.every(s => s.done);

  if (isDone) triggerConfetti();

  const payload = {
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    dueDate: task.dueDate,
    subtasks: JSON.stringify(subtasks),
    status: allDone ? "COMPLETED" : task.status
  };

  try {
    const res = await fetch(`${API_BASE}/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update subtask");
    loadTasks();
  } catch (error) {
    showToast("Subtask update failed", "error");
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = taskIdInput.value;
  const payload = {
    title: titleInput.value.trim(),
    description: descInput.value.trim() || null,
    category: categoryInput.value,
    priority: priorityInput.value,
    dueDate: dueDateInput.value || null,
    subtasks: currentFormSubtasks.length > 0 ? JSON.stringify(currentFormSubtasks) : null
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `${API_BASE}/${id}` : API_BASE;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to save task");
    showToast(isEdit ? "Task updated!" : "Task created!", "success");
    resetForm();
    loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function toggleTaskStatus(id, isCompleted) {
  const status = isCompleted ? "COMPLETED" : "PENDING";

  if (isCompleted) triggerConfetti();

  try {
    const res = await fetch(`${API_BASE}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Status update failed");
    showToast(`Task marked as ${status.toLowerCase()} 🎉`, "success");
    loadTasks();
  } catch (error) {
    showToast("Failed to update status", "error");
    loadTasks();
  }
}

async function editTask(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error("Could not fetch task");
    const task = await res.json();
    taskIdInput.value = task.id;
    titleInput.value = task.title;
    descInput.value = task.description || "";
    categoryInput.value = task.category || "PERSONAL";
    priorityInput.value = task.priority;
    dueDateInput.value = task.dueDate || "";

    try {
      currentFormSubtasks = task.subtasks ? JSON.parse(task.subtasks) : [];
    } catch(e) {
      currentFormSubtasks = [];
    }
    renderFormSubtasks();

    formTitle.textContent = "Edit Task";
    saveBtn.textContent = "Update Task";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showToast("Failed to load task", "error");
  }
}

async function confirmDelete(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    showToast("Task deleted", "success");
    loadTasks();
  } catch (error) {
    showToast("Failed to delete task", "error");
  }
}

function resetForm() {
  taskIdInput.value = "";
  taskForm.reset();
  currentFormSubtasks = [];
  renderFormSubtasks();
  formTitle.textContent = "Create New Task";
  saveBtn.textContent = "Save Task";
  cancelBtn.classList.add("hidden");
}

function showToast(message, type = "info") {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
}