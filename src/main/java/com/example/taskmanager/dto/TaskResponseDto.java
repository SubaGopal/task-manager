package com.example.taskmanager.dto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskResponseDto {
    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private TaskCategory category;
    private String subtasks;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public TaskResponseDto(Long id, String title, String description, TaskStatus status,
                           TaskPriority priority, TaskCategory category, String subtasks,
                           LocalDate dueDate, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id; this.title = title; this.description = description;
        this.status = status; this.priority = priority; this.category = category;
        this.subtasks = subtasks; this.dueDate = dueDate;
        this.createdAt = createdAt; this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public TaskStatus getStatus() { return status; }
    public TaskPriority getPriority() { return priority; }
    public TaskCategory getCategory() { return category; }
    public String getSubtasks() { return subtasks; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}