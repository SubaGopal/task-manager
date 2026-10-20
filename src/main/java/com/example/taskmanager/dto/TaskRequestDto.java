package com.example.taskmanager.dto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
public class TaskRequestDto {
    @NotBlank(message = "Task title is required")
    @Size(max = 100, message = "Task title must not exceed 100 characters")
    private String title;
    @Size(max = 1000, message = "Task description must not exceed 1000 characters")
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private TaskCategory category;
    private LocalDate dueDate;
    public TaskRequestDto() {}
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }
    public TaskCategory getCategory() { return category; }
    public void setCategory(TaskCategory category) { this.category = category; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}