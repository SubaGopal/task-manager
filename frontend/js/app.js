// ==========================================
// CONFIG & STATE
// ==========================================
const API_BASE = "http://localhost:8080/api";
let currentTasks = [];
let formSubtasks = [];
let currentCalendarDate = new Date();
let authMode = "login"; // "login" or "register"

// ==========================================
// AUTHENTICATION LOGIC (JWT)
// ==========================================
function getToken() {
    return localStorage.getItem("tm_token");
}

function getStoredUser() {
    return localStorage.getItem("tm_username") || "User";
}

function checkAuth() {
    const token = getToken();
    const authModal = document.getElementById("authModal");
    if (!token) {
        authModal.classList.add("auth-active");
        authModal.style.display = "flex";
    } else {
        authModal.classList.remove("auth-active");
        authModal.style.display = "none";
        document.getElementById("userNameDisplay").textContent = getStoredUser();
        loadTasks();
    }
}

function switchAuthTab(mode) {
    authMode = mode;
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const emailGroup = document.getElementById("emailGroup");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const submitBtn = document.getElementById("authSubmitBtn");
    const errorMsg = document.getElementById("authError");
    errorMsg.style.display = "none";

    if (mode === "login") {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        emailGroup.style.display = "none";
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Sign in to manage your tasks securely";
        submitBtn.textContent = "Sign In";
    } else {
        tabLogin.classList.remove("active");
        tabRegister.classList.add("active");
        emailGroup.style.display = "block";
        authTitle.textContent = "Create Account";
        authSubtitle.textContent = "Register and start organizing your tasks";
        submitBtn.textContent = "Register & Login";
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const email = document.getElementById("authEmail").value.trim();
    const errorMsg = document.getElementById("authError");
    errorMsg.style.display = "none";

    const endpoint = authMode === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    const payload = authMode === "login" ? { username, password } : { username, password, email };

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            errorMsg.textContent = data.message || "Authentication failed!";
            errorMsg.style.display = "block";
            return;
        }

        // Store Token & Username
        localStorage.setItem("tm_token", data.token);
        localStorage.setItem("tm_username", data.username);

        document.getElementById("authModal").classList.remove("auth-active");
        document.getElementById("authModal").style.display = "none";
        document.getElementById("userNameDisplay").textContent = data.username;

        // Reset form
        document.getElementById("authForm").reset();
        loadTasks();
    } catch (err) {
        errorMsg.textContent = "Cannot connect to server. Ensure Spring Boot is running!";
        errorMsg.style.display = "block";
    }
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("tm_token");
        localStorage.removeItem("tm_username");
        currentTasks = [];
        renderTasks();
        checkAuth();
    }
}

function getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupEventListeners();
    initSpeechRecognition();
    setupKeyboardShortcuts();
    checkAuth();
});

function initTheme() {
    const saved = localStorage.getItem("tm_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tm_theme", next);
    updateThemeIcon(next);
}

// ==========================================
// TASKS API CALLS (SECURED WITH BEARER TOKEN)
// ==========================================
async function loadTasks() {
    const token = getToken();
    if (!token) return;

    const category = document.getElementById("filterCategory").value;
    const priority = document.getElementById("filterPriority").value;
    const status = document.getElementById("filterStatus").value;
    const search = document.getElementById("searchInput").value.trim();

    let url = `${API_BASE}/tasks?sortBy=createdAt&sortDirection=desc`;
    if (category) url += `&category=${category}`;
    if (priority) url += `&priority=${priority}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }
        currentTasks = await res.json();
        renderTasks();
        updateDashboardStats(); updateNotifications();
    } catch (err) {
        console.error("Error loading tasks:", err);
    }
}

async function saveTask(e) {
    e.preventDefault();
    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDesc").value.trim();
    const category = document.getElementById("taskCategory").value;
    const priority = document.getElementById("taskPriority").value;
    const dueDate = document.getElementById("taskDueDate").value || null;

    const payload = {
        title,
        description,
        category,
        priority,
        dueDate,
        subtasks: JSON.stringify(formSubtasks)
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE}/tasks/${id}` : `${API_BASE}/tasks`;

    try {
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            resetForm();
            loadTasks();
        }
    } catch (err) {
        console.error("Error saving task:", err);
    }
}

async function toggleTaskStatus(id, currentStatus) {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
        const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) {
            if (nextStatus === "COMPLETED") triggerConfetti();
            loadTasks();
        }
    } catch (err) {
        console.error("Error updating status:", err);
    }
}

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (res.ok) loadTasks();
    } catch (err) {
        console.error("Error deleting task:", err);
    }
}

async function toggleCardSubtask(taskId, subIndex) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;
    let subs = [];
    try { subs = JSON.parse(task.subtasks || "[]"); } catch(e){}
    if (subs[subIndex]) {
        subs[subIndex].completed = !subs[subIndex].completed;
    }
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                category: task.category,
                priority: task.priority,
                dueDate: task.dueDate,
                subtasks: JSON.stringify(subs)
            })
        });
        if (res.ok) loadTasks();
    } catch(err) { console.error(err); }
}

// ==========================================
// RENDER & VIEWS
// ==========================================
function renderTasks() {
    renderGridView();
    renderKanbanView();
    renderCalendarView();
}

function renderGridView() {
    const container = document.getElementById("taskList");
    if (!currentTasks.length) {
        container.innerHTML = `<div class="empty-state">No tasks found. Create one to get started! 🚀</div>`;
        return;
    }
    container.innerHTML = currentTasks.map(t => createTaskCardHtml(t)).join("");
}

function createTaskCardHtml(t) {
    const isCompleted = t.status === "COMPLETED";
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date().setHours(0,0,0,0) && !isCompleted;
    let subtasks = [];
    try { subtasks = JSON.parse(t.subtasks || "[]"); } catch(e){}

    const completedSubs = subtasks.filter(s => s.completed).length;
    const subProgress = subtasks.length ? Math.round((completedSubs / subtasks.length) * 100) : 0;

    return `
        <div class="task-card ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue-card' : ''}">
            <div class="card-badges">
                <span class="badge badge-cat badge-cat-${(t.category||'WORK').toLowerCase()}">${t.category}</span>
                <span class="badge badge-pri badge-pri-${(t.priority||'MEDIUM').toLowerCase()}">${t.priority}</span>
            </div>
            <h3 class="task-card-title">${escapeHtml(t.title)}</h3>
            <p class="task-card-desc">${escapeHtml(t.description || 'No description provided')}</p>
            
            ${subtasks.length ? `
                <div class="card-subtasks-preview">
                    <div class="sub-progress-header">
                        <span>Checklist: ${completedSubs}/${subtasks.length}</span>
                        <span>${subProgress}%</span>
                    </div>
                    <div class="sub-track"><div class="sub-fill" style="width: ${subProgress}%"></div></div>
                    <div class="card-sub-items">
                        ${subtasks.map((st, i) => `
                            <label class="card-sub-label ${st.completed ? 'sub-checked' : ''}">
                                <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleCardSubtask(${t.id}, ${i})">
                                <span>${escapeHtml(st.title)}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>
            ` : ''}

            <div class="card-footer">
                <span class="task-card-date">${t.dueDate ? '📅 ' + t.dueDate : 'No due date'}</span>
                <div class="card-actions">
                    <button class="btn-action" onclick="toggleTaskStatus(${t.id}, '${t.status}')" title="${isCompleted ? 'Mark In Progress' : 'Mark Completed'}">
                        ${isCompleted ? '↩️' : '✅'}
                    </button>
                    <button class="btn-action" onclick="editTask(${t.id})" title="Edit">✏️</button>
                    <button class="btn-action text-danger" onclick="deleteTask(${t.id})" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

function renderKanbanView() {
    const todoCol = document.getElementById("colTodo");
    const highCol = document.getElementById("colHigh");
    const doneCol = document.getElementById("colDone");

    const todos = currentTasks.filter(t => t.status !== "COMPLETED" && t.priority !== "HIGH");
    const highs = currentTasks.filter(t => t.status !== "COMPLETED" && t.priority === "HIGH");
    const dones = currentTasks.filter(t => t.status === "COMPLETED");

    document.getElementById("countTodo").textContent = todos.length;
    document.getElementById("countHigh").textContent = highs.length;
    document.getElementById("countDone").textContent = dones.length;

    todoCol.innerHTML = todos.length ? todos.map(t => createTaskCardHtml(t)).join("") : '<div class="empty-state-sm">No tasks in To Do</div>';
    highCol.innerHTML = highs.length ? highs.map(t => createTaskCardHtml(t)).join("") : '<div class="empty-state-sm">No high priority tasks</div>';
    doneCol.innerHTML = dones.length ? dones.map(t => createTaskCardHtml(t)).join("") : '<div class="empty-state-sm">No completed tasks</div>';
}

function renderCalendarView() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calMonthYear").textContent = `${months[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById("calendarDaysGrid");
    grid.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="cal-day cal-empty"></div>`;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = currentTasks.filter(t => t.dueDate === dateStr);
        const isToday = dateStr === todayStr;

        grid.innerHTML += `
            <div class="cal-day ${isToday ? 'cal-today' : ''}">
                <div class="cal-date-number">${d}</div>
                <div class="cal-day-tasks">
                    ${dayTasks.map(t => `
                        <div class="cal-task-pill pri-${(t.priority||'medium').toLowerCase()}" onclick="editTask(${t.id})">
                            ${escapeHtml(t.title)}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }
}

// ==========================================
// DASHBOARD STATS
// ==========================================
function updateDashboardStats() {
    const total = currentTasks.length;
    const completed = currentTasks.filter(t => t.status === "COMPLETED").length;
    const pending = total - completed;
    const now = new Date().setHours(0,0,0,0);
    const overdue = currentTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED").length;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statCompleted").textContent = completed;
    document.getElementById("statOverdue").textContent = overdue;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById("progressBar").style.width = `${percent}%`;
    document.getElementById("progressText").textContent = `${percent}%`;
}

// ==========================================
// SUBTASKS, EDIT & EVENT LISTENERS
// ==========================================
function editTask(id) {
    const task = currentTasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById("taskId").value = task.id;
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDesc").value = task.description || "";
    document.getElementById("taskCategory").value = task.category || "WORK";
    document.getElementById("taskPriority").value = task.priority || "MEDIUM";
    document.getElementById("taskDueDate").value = task.dueDate || "";

    try {
        formSubtasks = JSON.parse(task.subtasks || "[]");
    } catch(e) { formSubtasks = []; }
    renderFormSubtasks();

    document.getElementById("formTitle").textContent = "Edit Task";
    document.getElementById("cancelBtn").style.display = "block";
    document.getElementById("taskTitle").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
    document.getElementById("taskForm").reset();
    document.getElementById("taskId").value = "";
    document.getElementById("formTitle").textContent = "Create New Task";
    document.getElementById("cancelBtn").style.display = "none";
    formSubtasks = [];
    renderFormSubtasks();
}

function renderFormSubtasks() {
    const list = document.getElementById("formSubtaskList");
    list.innerHTML = formSubtasks.map((st, i) => `
        <li class="form-subtask-item">
            <span>${escapeHtml(st.title)}</span>
            <button type="button" class="btn-del-sub" onclick="removeSubtask(${i})">&times;</button>
        </li>
    `).join("");
}

function removeSubtask(i) {
    formSubtasks.splice(i, 1);
    renderFormSubtasks();
}

function setQuickDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    document.getElementById("taskDueDate").value = d.toISOString().split("T")[0];
}

function setupEventListeners() {
    document.getElementById("taskForm").addEventListener("submit", saveTask);
    document.getElementById("cancelBtn").addEventListener("click", resetForm);

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    document.getElementById("filterCategory").addEventListener("change", loadTasks);
    document.getElementById("filterPriority").addEventListener("change", loadTasks);
    document.getElementById("filterStatus").addEventListener("change", loadTasks);
    document.getElementById("searchInput").addEventListener("input", debounce(loadTasks, 300));

    document.getElementById("addSubtaskBtn").addEventListener("click", () => {
        const input = document.getElementById("newSubtaskInput");
        const val = input.value.trim();
        if (val) {
            formSubtasks.push({ title: val, completed: false });
            input.value = "";
            renderFormSubtasks();
        }
    });

    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".task-view-container").forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            document.getElementById(`${e.target.dataset.view}View`).classList.add("active");
        });
    });

    document.getElementById("calPrevBtn").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendarView();
    });
    document.getElementById("calNextBtn").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendarView();
    });
    document.getElementById("calTodayBtn").addEventListener("click", () => {
        currentCalendarDate = new Date();
        renderCalendarView();
    });

    document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
    document.getElementById("shortcutsBtn").addEventListener("click", () => {
        openShortcutsModal();
    });
}

function exportCsv() {
    if (!currentTasks.length) return alert("No tasks to export!");
    let csv = "ID,Title,Description,Status,Priority,Category,DueDate,CreatedAt\n";
    currentTasks.forEach(t => {
        csv += `"${t.id}","${(t.title||'').replace(/"/g, '""')}","${(t.description||'').replace(/"/g, '""')}","${t.status}","${t.priority}","${t.category}","${t.dueDate||''}","${t.createdAt}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_backup_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
}

function openShortcutsModal() {
    const modal = document.getElementById("shortcutsModal");
    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function closeShortcutsModal() {
    const modal = document.getElementById("shortcutsModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (document.getElementById("authModal").classList.contains("auth-active")) return;
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

        if (e.key === "n" || e.key === "N") {
            e.preventDefault();
            document.getElementById("taskTitle").focus();
        } else if (e.key === "/" || e.key === "f" || e.key === "F") {
            e.preventDefault();
            document.getElementById("searchInput").focus();
        } else if (e.key === "t" || e.key === "T") {
            toggleTheme();
        } else if (e.key === "v" || e.key === "V") {
            const views = ["grid", "kanban", "calendar"];
            const currentActive = document.querySelector(".view-btn.active").dataset.view;
            const nextIdx = (views.indexOf(currentActive) + 1) % views.length;
            document.querySelector(`.view-btn[data-view="${views[nextIdx]}"]`).click();
        } else if (e.key === "Escape") {
            closeShortcutsModal();
            resetForm();
        }
    });
}

function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    document.querySelectorAll(".voice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const targetInput = document.getElementById(targetId);
            const rec = new SpeechRec();
            rec.lang = "en-US";
            btn.classList.add("listening");
            rec.start();
            rec.onresult = (e) => {
                const text = e.results[0][0].transcript;
                targetInput.value = targetInput.value ? `${targetInput.value} ${text}` : text;
            };
            rec.onend = () => btn.classList.remove("listening");
        });
    });
}

function triggerConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * canvas.width,
        y: -10,
        r: Math.random() * 6 + 4,
        color: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"][Math.floor(Math.random() * 5)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 3
    }));

    let frame = 0;
    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        if (++frame < 120) requestAnimationFrame(anim);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    anim();
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ==========================================
// AI SMART SUBTASK BREAKDOWN
// ==========================================
async function triggerAiBreakdown() {
    const titleInput = document.getElementById("taskTitle");
    const title = titleInput.value.trim();
    if (!title) {
        alert("Please enter a Task Title first (e.g. 'Learn Spring Security' or 'Plan Weekend Trip')!");
        titleInput.focus();
        return;
    }

    const aiBtn = document.getElementById("aiBreakdownBtn");
    const origText = aiBtn.innerHTML;
    aiBtn.innerHTML = "✨ AI Thinking...";
    aiBtn.classList.add("thinking");

    try {
        const desc = document.getElementById("taskDesc").value.trim();
        const res = await fetch(`${API_BASE}/ai/breakdown`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, description: desc })
        });

        if (!res.ok) throw new Error("AI request failed");

        const data = await res.json();

        // 1. Auto-fill Subtasks
        if (data.subtasks && data.subtasks.length > 0) {
            formSubtasks = data.subtasks.map(step => ({ title: step, completed: false }));
            renderFormSubtasks();
        }

        // 2. Auto-select Suggested Category
        if (data.suggestedCategory) {
            const catSelect = document.getElementById("taskCategory");
            for (let opt of catSelect.options) {
                if (opt.value === data.suggestedCategory) {
                    catSelect.value = data.suggestedCategory;
                    break;
                }
            }
        }

        // 3. Auto-select Suggested Priority
        if (data.suggestedPriority) {
            const priSelect = document.getElementById("taskPriority");
            for (let opt of priSelect.options) {
                if (opt.value === data.suggestedPriority) {
                    priSelect.value = data.suggestedPriority;
                    break;
                }
            }
        }

        // Celebration micro-confetti
        triggerConfetti();

    } catch (err) {
        console.error("AI Breakdown Error:", err);
        alert("Could not reach AI service. Please ensure backend is running!");
    } finally {
        aiBtn.innerHTML = origText;
        aiBtn.classList.remove("thinking");
    }
}

// ==========================================
// NOTIFICATION CENTER & CHIME ALERTS
// ==========================================
let audioCtx = null;
let lastChimedTaskCount = 0;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Gentle Melodic Chime using Web Audio API (C5 -> E5 -> G5)
function playNotifChime() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 notes

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.45);
        });
    } catch (e) {
        console.warn("Audio chime disabled or blocked by browser:", e);
    }
}

function testNotificationChime() {
    playNotifChime();
}

function enablePushNotifications() {
    if (!("Notification" in window)) {
        alert("This browser does not support Desktop Push Notifications.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("Task Manager Pro 🔔", {
                body: "Desktop Notifications are now enabled! You will be alerted for due tasks.",
                icon: "favicon.ico"
            });
            playNotifChime();
        } else {
            alert("Notification permission was denied. You can enable it in browser settings.");
        }
    });
}

function toggleNotifDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("notifDropdown");
    if (dropdown) {
        dropdown.classList.toggle("active");
    }
}

// Close notification dropdown when clicking outside
document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".notif-wrapper");
    const dropdown = document.getElementById("notifDropdown");
    if (dropdown && dropdown.classList.contains("active") && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove("active");
    }
});

function updateNotifications() {
    const badge = document.getElementById("notifBadge");
    const list = document.getElementById("notifList");
    const subtext = document.getElementById("notifSubtext");
    if (!badge || !list) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const todayTimestamp = new Date().setHours(0, 0, 0, 0);

    const overdueList = [];
    const todayList = [];
    const upcomingList = [];

    currentTasks.forEach(t => {
        if (t.status === "COMPLETED" || !t.dueDate) return;
        const taskDate = new Date(t.dueDate).setHours(0, 0, 0, 0);

        if (taskDate < todayTimestamp) {
            overdueList.push(t);
        } else if (t.dueDate === todayStr) {
            todayList.push(t);
        } else {
            const diffDays = Math.round((taskDate - todayTimestamp) / (1000 * 60 * 60 * 24));
            if (diffDays <= 2) {
                upcomingList.push(t);
            }
        }
    });

    const totalAlerts = overdueList.length + todayList.length;

    // Update Badge
    if (totalAlerts > 0) {
        badge.textContent = totalAlerts;
        badge.style.display = "flex";
        subtext.textContent = `${overdueList.length} Overdue · ${todayList.length} Due Today`;
    } else {
        badge.style.display = "none";
        subtext.textContent = "All tasks on track 🎉";
    }

    // Play Chime on fresh overdue/due alerts
    if (totalAlerts > 0 && totalAlerts > lastChimedTaskCount) {
        playNotifChime();
        if ("Notification" in window && Notification.permission === "granted") {
            const firstAlert = overdueList[0] || todayList[0];
            new Notification(`Task Reminder: ${firstAlert.title}`, {
                body: `Priority: ${firstAlert.priority} · Category: ${firstAlert.category}`,
                icon: "favicon.ico"
            });
        }
    }
    lastChimedTaskCount = totalAlerts;

    // Render Notifications HTML
    if (overdueList.length === 0 && todayList.length === 0 && upcomingList.length === 0) {
        list.innerHTML = `<div class="notif-empty">No pending alerts right now! You're completely up to date 🚀</div>`;
        return;
    }

    let html = "";

    overdueList.forEach(t => {
        html += `
            <div class="notif-item overdue">
                <div class="notif-item-content">
                    <div class="notif-item-title" onclick="editTask(${t.id}); toggleNotifDropdown();">${escapeHtml(t.title)}</div>
                    <div class="notif-item-meta overdue-text">⚠️ Overdue (Due: ${t.dueDate})</div>
                </div>
                <div class="notif-item-actions">
                    <button class="btn-action" onclick="toggleTaskStatus(${t.id}, '${t.status}')" title="Mark Done">✅</button>
                    <button class="btn-action" onclick="editTask(${t.id}); toggleNotifDropdown();" title="Edit">✏️</button>
                </div>
            </div>
        `;
    });

    todayList.forEach(t => {
        html += `
            <div class="notif-item today">
                <div class="notif-item-content">
                    <div class="notif-item-title" onclick="editTask(${t.id}); toggleNotifDropdown();">${escapeHtml(t.title)}</div>
                    <div class="notif-item-meta today-text">⏳ Due Today (${t.dueDate})</div>
                </div>
                <div class="notif-item-actions">
                    <button class="btn-action" onclick="toggleTaskStatus(${t.id}, '${t.status}')" title="Mark Done">✅</button>
                    <button class="btn-action" onclick="editTask(${t.id}); toggleNotifDropdown();" title="Edit">✏️</button>
                </div>
            </div>
        `;
    });

    upcomingList.forEach(t => {
        html += `
            <div class="notif-item upcoming">
                <div class="notif-item-content">
                    <div class="notif-item-title" onclick="editTask(${t.id}); toggleNotifDropdown();">${escapeHtml(t.title)}</div>
                    <div class="notif-item-meta upcoming-text">📅 Upcoming (Due: ${t.dueDate})</div>
                </div>
                <div class="notif-item-actions">
                    <button class="btn-action" onclick="editTask(${t.id}); toggleNotifDropdown();" title="Edit">✏️</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// ==========================================
// SMART VOICE-TO-TASK ASSISTANT (NATURAL NLP)
// ==========================================
let smartVoiceRecognition = null;
let isSmartVoiceListening = false;

function openSmartVoiceModal() {
    const modal = document.getElementById("smartVoiceModal");
    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
        document.getElementById("smartVoiceInput").focus();
    }
}

function closeSmartVoiceModal() {
    const modal = document.getElementById("smartVoiceModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
    if (isSmartVoiceListening && smartVoiceRecognition) {
        smartVoiceRecognition.stop();
    }
}

function toggleVoiceRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        alert("Speech Recognition is not supported in this browser. You can type directly in the box!");
        return;
    }

    const recBtn = document.getElementById("startVoiceRecBtn");
    const visualizer = document.querySelector(".voice-visualizer");
    const transcriptInput = document.getElementById("smartVoiceInput");

    if (isSmartVoiceListening) {
        if (smartVoiceRecognition) smartVoiceRecognition.stop();
        return;
    }

    smartVoiceRecognition = new SpeechRec();
    smartVoiceRecognition.lang = "en-US";
    smartVoiceRecognition.continuous = false;
    smartVoiceRecognition.interimResults = true;

    smartVoiceRecognition.onstart = () => {
        isSmartVoiceListening = true;
        recBtn.innerHTML = "🔴 Listening... (Speak now)";
        recBtn.style.background = "#ef4444";
        visualizer.classList.add("recording");
    };

    smartVoiceRecognition.onresult = (e) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            transcript += e.results[i][0].transcript;
        }
        transcriptInput.value = transcript;
    };

    smartVoiceRecognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
    };

    smartVoiceRecognition.onend = () => {
        isSmartVoiceListening = false;
        recBtn.innerHTML = "🎙️ Start Listening";
        recBtn.style.background = "";
        visualizer.classList.remove("recording");
        // Auto trigger AI extraction if text captured
        if (transcriptInput.value.trim().length > 3) {
            processSmartVoicePrompt();
        }
    };

    smartVoiceRecognition.start();
}

async function processSmartVoicePrompt() {
    const promptInput = document.getElementById("smartVoiceInput");
    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert("Please speak or type a task first!");
        return;
    }

    const modal = document.getElementById("smartVoiceModal");
    const origPlaceholder = promptInput.placeholder;
    promptInput.value = "🧠 AI is extracting details from: \"" + prompt + "\"...";

    try {
        const res = await fetch(`${API_BASE}/ai/parse-prompt`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ prompt: prompt })
        });

        if (!res.ok) throw new Error("NLP Parse failed");

        const data = await res.json();

        // 1. Fill Title
        if (data.title) {
            document.getElementById("taskTitle").value = data.title;
        }

        // 2. Fill Description
        if (data.description) {
            document.getElementById("taskDesc").value = data.description;
        }

        // 3. Set Category
        if (data.category) {
            const catSelect = document.getElementById("taskCategory");
            for (let opt of catSelect.options) {
                if (opt.value === data.category) {
                    catSelect.value = data.category;
                    break;
                }
            }
        }

        // 4. Set Priority
        if (data.priority) {
            const priSelect = document.getElementById("taskPriority");
            for (let opt of priSelect.options) {
                if (opt.value === data.priority) {
                    priSelect.value = data.priority;
                    break;
                }
            }
        }

        // 5. Set Due Date
        if (data.dueDate) {
            document.getElementById("taskDueDate").value = data.dueDate;
        }

        // 6. Subtasks
        if (data.subtasks && data.subtasks.length > 0) {
            formSubtasks = data.subtasks.map(s => ({ title: s, completed: false }));
            renderFormSubtasks();
        }

        // Close Modal & Celebrate
        closeSmartVoiceModal();
        promptInput.value = "";
        triggerConfetti();
        playNotifChime();

        // Smooth scroll to form
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
        console.error("AI NLP parse error:", err);
        alert("Could not extract details. Ensure backend is running!");
    } finally {
        promptInput.placeholder = origPlaceholder;
    }
}