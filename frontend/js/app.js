// ==========================================
// CONSTANTS & STATE
// ==========================================
const API = "http://localhost:8080/api";
let currentTasks = [];
let formSubtasks = [];
let currentCalDate = new Date();
let authMode = "login";

// ==========================================
// AUTH FUNCTIONS
// ==========================================
function getToken() { return localStorage.getItem("tm_token"); }
function getUsername() { return localStorage.getItem("tm_username") || "User"; }

function getHeaders() {
    const h = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h["Authorization"] = "Bearer " + t;
    return h;
}

function checkAuth() {
    if (getToken()) {
        showApp();
    } else {
        showAuthModal();
    }
}

function showApp() {
    document.getElementById("authOverlay").style.display = "none";
    document.getElementById("appContainer").style.display = "block";
    document.getElementById("userDisplay").textContent = getUsername();
    loadTasks();
}

function showAuthModal() {
    document.getElementById("authOverlay").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
}

function switchTab(mode) {
    authMode = mode;
    const isLogin = mode === "login";
    document.getElementById("tabLogin").className = "auth-tab" + (isLogin ? " active" : "");
    document.getElementById("tabRegister").className = "auth-tab" + (!isLogin ? " active" : "");
    document.getElementById("emailGroup").style.display = isLogin ? "none" : "block";
    document.getElementById("authTitle").textContent = isLogin ? "Welcome Back" : "Create Account";
    document.getElementById("authSubtitle").textContent = isLogin ? "Sign in to manage your tasks" : "Register and start organizing!";
    document.getElementById("authBtn").textContent = isLogin ? "Sign In" : "Register";
    document.getElementById("authError").style.display = "none";
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const email = document.getElementById("authEmail").value.trim();
    const errDiv = document.getElementById("authError");
    errDiv.style.display = "none";

    const url = API + (authMode === "login" ? "/auth/login" : "/auth/register");
    const body = authMode === "login"
        ? { username, password }
        : { username, password, email };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            errDiv.textContent = data.message || "Something went wrong!";
            errDiv.style.display = "block";
            return;
        }

        // SUCCESS
        localStorage.setItem("tm_token", data.token);
        localStorage.setItem("tm_username", data.username);
        document.getElementById("authForm").reset();
        showApp();

    } catch (err) {
        errDiv.textContent = "Cannot connect to server! Make sure Spring Boot is running on port 8080.";
        errDiv.style.display = "block";
    }
}

function logout() {
    if (!confirm("Logout cheyyalamaa?")) return;
    localStorage.removeItem("tm_token");
    localStorage.removeItem("tm_username");
    currentTasks = [];
    showAuthModal();
}

// ==========================================
// INIT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    checkAuth();
    setupListeners();
    initVoice();
    setupKeyboard();
});

function initTheme() {
    const t = localStorage.getItem("tm_theme") || "light";
    document.documentElement.setAttribute("data-theme", t);
    document.getElementById("themeToggle").textContent = t === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tm_theme", next);
    document.getElementById("themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
}

// ==========================================
// TASK API CALLS
// ==========================================
async function loadTasks() {
    if (!getToken()) return;
    const cat = document.getElementById("filterCategory").value;
    const pri = document.getElementById("filterPriority").value;
    const sta = document.getElementById("filterStatus").value;
    const src = document.getElementById("searchInput").value.trim();

    let url = `${API}/tasks?sortBy=createdAt&sortDirection=desc`;
    if (cat) url += `&category=${cat}`;
    if (pri) url += `&priority=${pri}`;
    if (sta) url += `&status=${sta}`;
    if (src) url += `&search=${encodeURIComponent(src)}`;

    try {
        const res = await fetch(url, { headers: getHeaders() });
        if (res.status === 401) { logout(); return; }
        currentTasks = await res.json();
        renderAll();
        updateStats();
    } catch (e) {
        console.error("Load tasks error:", e);
    }
}

async function saveTask(e) {
    e.preventDefault();
    const id = document.getElementById("taskId").value;
    const payload = {
        title: document.getElementById("taskTitle").value.trim(),
        description: document.getElementById("taskDesc").value.trim(),
        category: document.getElementById("taskCategory").value,
        priority: document.getElementById("taskPriority").value,
        dueDate: document.getElementById("taskDueDate").value || null,
        subtasks: JSON.stringify(formSubtasks)
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API}/tasks/${id}` : `${API}/tasks`;

    try {
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
        if (res.ok) { resetForm(); loadTasks(); }
        else {
            const d = await res.json();
            alert("Error: " + (d.message || res.status));
        }
    } catch (e) { console.error(e); }
}

async function toggleStatus(id, currentStatus) {
    const next = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
        const res = await fetch(`${API}/tasks/${id}/status`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({ status: next })
        });
        if (res.ok) {
            if (next === "COMPLETED") confetti();
            loadTasks();
        }
    } catch (e) { console.error(e); }
}

async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    try {
        const res = await fetch(`${API}/tasks/${id}`, { method: "DELETE", headers: getHeaders() });
        if (res.ok) loadTasks();
    } catch (e) { console.error(e); }
}

// ==========================================
// RENDER
// ==========================================
function renderAll() {
    renderGrid();
    renderKanban();
    renderCalendar();
}

function renderGrid() {
    const el = document.getElementById("taskList");
    if (!currentTasks.length) {
        el.innerHTML = '<div class="empty-state">No tasks yet! Create one above 🚀</div>';
        return;
    }
    el.innerHTML = currentTasks.map(taskCard).join("");
}

function taskCard(t) {
    const done = t.status === "COMPLETED";
    const now = new Date().setHours(0,0,0,0);
    const overdue = t.dueDate && new Date(t.dueDate) < now && !done;
    let subs = [];
    try { subs = JSON.parse(t.subtasks || "[]"); } catch(e){}
    const comp = subs.filter(s => s.completed).length;
    const pct = subs.length ? Math.round(comp/subs.length*100) : 0;

    return `<div class="task-card ${done ? "completed" : ""} ${overdue ? "overdue-card" : ""}">
        <div class="card-badges">
            <span class="badge badge-cat badge-cat-${(t.category||"work").toLowerCase()}">${t.category}</span>
            <span class="badge badge-pri badge-pri-${(t.priority||"medium").toLowerCase()}">${t.priority}</span>
        </div>
        <h3 class="task-card-title">${esc(t.title)}</h3>
        <p class="task-card-desc">${esc(t.description || "")}</p>
        ${subs.length ? `<div class="card-subtasks-preview">
            <div class="sub-progress-header"><span>${comp}/${subs.length} subtasks</span><span>${pct}%</span></div>
            <div class="sub-track"><div class="sub-fill" style="width:${pct}%"></div></div>
        </div>` : ""}
        <div class="card-footer">
            <span class="task-card-date">${t.dueDate ? "📅 "+t.dueDate : "No due date"}</span>
            <div class="card-actions">
                <button class="btn-action" onclick="toggleStatus(${t.id},'${t.status}')" title="${done ? "Mark Pending" : "Complete"}">${done ? "↩️" : "✅"}</button>
                <button class="btn-action" onclick="editTask(${t.id})" title="Edit">✏️</button>
                <button class="btn-action text-danger" onclick="deleteTask(${t.id})" title="Delete">🗑️</button>
            </div>
        </div>
    </div>`;
}

function renderKanban() {
    const todos = currentTasks.filter(t => t.status !== "COMPLETED" && t.priority !== "HIGH");
    const highs = currentTasks.filter(t => t.status !== "COMPLETED" && t.priority === "HIGH");
    const dones = currentTasks.filter(t => t.status === "COMPLETED");
    document.getElementById("countTodo").textContent = todos.length;
    document.getElementById("countHigh").textContent = highs.length;
    document.getElementById("countDone").textContent = dones.length;
    document.getElementById("colTodo").innerHTML = todos.map(taskCard).join("");
    document.getElementById("colHigh").innerHTML = highs.map(taskCard).join("");
    document.getElementById("colDone").innerHTML = dones.map(taskCard).join("");
}

function renderCalendar() {
    const y = currentCalDate.getFullYear(), m = currentCalDate.getMonth();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById("calMonthYear").textContent = `${months[m]} ${y}`;
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m+1, 0).getDate();
    const todayStr = new Date().toISOString().split("T")[0];
    let html = Array(first).fill('<div class="cal-day cal-empty"></div>').join("");
    for (let d = 1; d <= days; d++) {
        const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const dt = currentTasks.filter(t => t.dueDate === ds);
        html += `<div class="cal-day ${ds===todayStr?"cal-today":""}">
            <div class="cal-date-number">${d}</div>
            <div class="cal-day-tasks">${dt.map(t=>`<div class="cal-task-pill pri-${(t.priority||"medium").toLowerCase()}" onclick="editTask(${t.id})">${esc(t.title)}</div>`).join("")}</div>
        </div>`;
    }
    document.getElementById("calendarDaysGrid").innerHTML = html;
}

function updateStats() {
    const total = currentTasks.length;
    const done = currentTasks.filter(t => t.status === "COMPLETED").length;
    const now = new Date().setHours(0,0,0,0);
    const over = currentTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED").length;
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statPending").textContent = total - done;
    document.getElementById("statCompleted").textContent = done;
    document.getElementById("statOverdue").textContent = over;
    const pct = total ? Math.round(done/total*100) : 0;
    document.getElementById("progressBar").style.width = pct + "%";
    document.getElementById("progressText").textContent = pct + "%";
}

// ==========================================
// FORM
// ==========================================
function editTask(id) {
    const t = currentTasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById("taskId").value = t.id;
    document.getElementById("taskTitle").value = t.title;
    document.getElementById("taskDesc").value = t.description || "";
    document.getElementById("taskCategory").value = t.category || "WORK";
    document.getElementById("taskPriority").value = t.priority || "MEDIUM";
    document.getElementById("taskDueDate").value = t.dueDate || "";
    try { formSubtasks = JSON.parse(t.subtasks || "[]"); } catch(e) { formSubtasks = []; }
    renderSubtasks();
    document.getElementById("formTitle").textContent = "Edit Task";
    document.getElementById("cancelBtn").style.display = "block";
    document.getElementById("taskTitle").focus();
    window.scrollTo(0, 0);
}

function resetForm() {
    document.getElementById("taskForm").reset();
    document.getElementById("taskId").value = "";
    document.getElementById("formTitle").textContent = "Create New Task";
    document.getElementById("cancelBtn").style.display = "none";
    formSubtasks = [];
    renderSubtasks();
}

function renderSubtasks() {
    document.getElementById("formSubtaskList").innerHTML = formSubtasks.map((s, i) =>
        `<li class="form-subtask-item"><span>${esc(s.title)}</span><button type="button" onclick="formSubtasks.splice(${i},1);renderSubtasks()">&times;</button></li>`
    ).join("");
}

function setQuickDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    document.getElementById("taskDueDate").value = d.toISOString().split("T")[0];
}

// ==========================================
// LISTENERS & KEYBOARD
// ==========================================
function setupListeners() {
    document.getElementById("taskForm").addEventListener("submit", saveTask);
    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    ["filterCategory","filterPriority","filterStatus"].forEach(id =>
        document.getElementById(id).addEventListener("change", loadTasks)
    );
    document.getElementById("searchInput").addEventListener("input", debounce(loadTasks, 300));
    document.getElementById("addSubtaskBtn").addEventListener("click", () => {
        const inp = document.getElementById("newSubtaskInput");
        if (inp.value.trim()) {
            formSubtasks.push({ title: inp.value.trim(), completed: false });
            inp.value = "";
            renderSubtasks();
        }
    });
    document.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", e => {
        document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".task-view-container").forEach(c => c.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById(e.target.dataset.view + "View").classList.add("active");
    }));
    document.getElementById("calPrevBtn").addEventListener("click", () => { currentCalDate.setMonth(currentCalDate.getMonth()-1); renderCalendar(); });
    document.getElementById("calNextBtn").addEventListener("click", () => { currentCalDate.setMonth(currentCalDate.getMonth()+1); renderCalendar(); });
    document.getElementById("calTodayBtn").addEventListener("click", () => { currentCalDate = new Date(); renderCalendar(); });
}

function setupKeyboard() {
    document.addEventListener("keydown", e => {
        if (document.getElementById("authOverlay").style.display !== "none") return;
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "n" || e.key === "N") document.getElementById("taskTitle").focus();
        if (e.key === "/" || e.key === "f" || e.key === "F") { e.preventDefault(); document.getElementById("searchInput").focus(); }
        if (e.key === "t" || e.key === "T") toggleTheme();
        if (e.key === "Escape") resetForm();
    });
}

// ==========================================
// VOICE
// ==========================================
function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    document.querySelectorAll(".voice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = document.getElementById(btn.dataset.target);
            const r = new SR();
            r.lang = "en-US";
            btn.classList.add("listening");
            r.start();
            r.onresult = e => { target.value = (target.value + " " + e.results[0][0].transcript).trim(); };
            r.onend = () => btn.classList.remove("listening");
        });
    });
}

// ==========================================
// CONFETTI
// ==========================================
function confetti() {
    const c = document.getElementById("confettiCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    const parts = Array.from({length: 80}, () => ({
        x: Math.random()*c.width, y: -10,
        r: Math.random()*6+4,
        color: ["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6"][Math.floor(Math.random()*5)],
        vx: (Math.random()-.5)*4, vy: Math.random()*4+3
    }));
    let f = 0;
    const anim = () => {
        ctx.clearRect(0,0,c.width,c.height);
        parts.forEach(p => { p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
        if (++f < 120) requestAnimationFrame(anim);
        else ctx.clearRect(0,0,c.width,c.height);
    };
    anim();
}

// ==========================================
// UTILS
// ==========================================
function exportCsv() {
    if (!currentTasks.length) return alert("No tasks!");
    let csv = "ID,Title,Status,Priority,Category,DueDate\n";
    currentTasks.forEach(t => { csv += `"${t.id}","${(t.title||"").replace(/"/g,'""')}","${t.status}","${t.priority}","${t.category}","${t.dueDate||""}"\n`; });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    a.download = "tasks.csv"; a.click();
}

function esc(s) {
    if (!s) return "";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}