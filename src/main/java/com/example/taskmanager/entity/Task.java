package com.example.taskmanager.entity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 150) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskStatus status = TaskStatus.PENDING;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskPriority priority = TaskPriority.MEDIUM;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskCategory category = TaskCategory.WORK;
    @Column(name = "subtasks", length = 3000) private String subtasks = "[]";
    @Column(name = "due_date") private LocalDate dueDate;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PreUpdate public void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus s) { this.status = s; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority p) { this.priority = p; }
    public TaskCategory getCategory() { return category; }
    public void setCategory(TaskCategory c) { this.category = c; }
    public String getSubtasks() { return subtasks; }
    public void setSubtasks(String s) { this.subtasks = s; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate d) { this.dueDate = d; }
    public User getUser() { return user; }
    public void setUser(User u) { this.user = u; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime c) { this.createdAt = c; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime u) { this.updatedAt = u; }
}