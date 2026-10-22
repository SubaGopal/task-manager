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

const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const sortBySelect = document.getElementById("sort-by");
const taskList = document.getElementById("task-list");
const loadingEl = document.getElementById("loading");
const toastEl = document.getElementById("toast");
const themeToggle = document.getElementById("theme-toggle");

// Stats Elements
const statTotal = document.getElementById("stat-total");
const statPending = document.getElementById("stat-pending");
const statCompleted = document.getElementById("stat-completed");
const statOverdue = document.getElementById("stat-overdue");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");

let allTasksData = [];
let searchTimeout;

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadTasks();
  setupEventListeners();
});

function initTheme() {
  const savedTheme = localStorage.getItem("app-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const nextTheme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    themeToggle.textContent = nextTheme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("app-theme", nextTheme);
  });
}

function setupEventListeners() {
  taskForm.addEventListener("submit", handleFormSubmit);
  cancelBtn.addEventListener("click", resetForm);

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTasks, 300);
  });

  filterCategory.addEventListener("change", loadTasks);
  filterStatus.addEventListener("change", loadTasks);
  filterPriority.addEventListener("change", loadTasks);
  sortBySelect.addEventListener("change", loadTasks);

  // Click on stat cards for quick filtering
  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("click", () => {
      const filter = card.dataset.filter;
      if (filter === "ALL") {
        filterStatus.value = "";
      } else if (filter === "PENDING" || filter === "COMPLETED") {
        filterStatus.value = filter;
      }
      loadTasks();
    });
  });
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
      if (!isCompleted && d < now) {
        isOverdue = true;
      }
    }

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

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = taskIdInput.value;
  const payload = {
    title: titleInput.value.trim(),
    description: descInput.value.trim() || null,
    category: categoryInput.value,
    priority: priorityInput.value,
    dueDate: dueDateInput.value || null
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
  try {
    const res = await fetch(`${API_BASE}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Status update failed");
    showToast(`Task marked as ${status.toLowerCase()}`, "success");
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
    formTitle.textContent = "Edit Task";
    saveBtn.textContent = "Update Task";
    cancelBtn.classList.remove("hidden");
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