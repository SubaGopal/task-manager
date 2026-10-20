# 📝 Task Manager Web Application

A full-stack, responsive Task Management application built with **Java 17**, **Spring Boot 3**, **MySQL**, and **Vanilla HTML5 / CSS3 / JavaScript**.

## 🚀 Key Features
- **Task CRUD**: Create, view, edit, and delete tasks.
- **Status & Priority**: Mark tasks as `PENDING` or `COMPLETED`, assign `LOW`, `MEDIUM`, or `HIGH` priorities.
- **Search & Filters**: Instant search by task title and filtering by status and priority.
- **Sorting**: Sort tasks dynamically by creation date, due date, or priority.
- **Clean UI/UX**: Responsive modern interface, feedback notifications (Toasts), and empty states.
- **RESTful API**: Standard REST architecture with Jakarta Bean Validation and Global Exception Handling.

## 🛠️ Tech Stack
- **Backend**: Java 17, Spring Boot 3.2, Spring Data JPA / Hibernate, Maven
- **Database**: MySQL 8.0
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Modern Fetch API)

## 📡 REST API Contract
- `POST /api/tasks` — Create a new task
- `GET /api/tasks` — List all tasks with filters and sorting
- `GET /api/tasks/{id}` — Get task details
- `PUT /api/tasks/{id}` — Update task
- `PATCH /api/tasks/{id}/status` — Toggle status
- `DELETE /api/tasks/{id}` — Delete a task

## ⚙️ How to Run Locally
1. **Database Setup**: `CREATE DATABASE IF NOT EXISTS task_manager_db;`
2. **Start Backend**: `mvn clean spring-boot:run`
3. **Open Frontend**: Double click and open `frontend/index.html` in your web brows
