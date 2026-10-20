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
const taskCount = document.getElementById("task-count");
const loadingEl = document.getElementById("loading");
const toastEl = document.getElementById("toast");
let searchTimeout;
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  setupEventListeners();
});
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
    renderTasks(tasks);
  } catch (error) {
    showToast("Server connection error", "error");
    taskList.innerHTML = `<div class="empty-state">Unable to load tasks from server.</div>`;
  } finally {
    loadingEl.classList.add("hidden");
  }
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
  taskCount.textContent = tasks.length;
  if (tasks.length === 0) {
    taskList.innerHTML = `<div class="empty-state"><p>No tasks found.</p><small>Create one using the form on the left!</small></div>`;
    return;
  }
  taskList.innerHTML = tasks.map(task => {
    const isCompleted = task.status === "COMPLETED";
    const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date";
    const cat = task.category || "PERSONAL";
    const catLabel = categoryIcons[cat] || cat;
    return `
      <div class="task-item ${isCompleted ? "completed" : ""}">
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