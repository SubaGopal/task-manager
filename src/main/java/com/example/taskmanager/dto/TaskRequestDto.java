package com.example.taskmanager.dto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import java.time.LocalDate;

public class TaskRequestDto {
    private String title;
    private String description;
    private TaskPriority priority;
    private TaskCategory category;
    private String subtasks;
    private LocalDate dueDate;

    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority p) { this.priority = p; }
    public TaskCategory getCategory() { return category; }
    public void setCategory(TaskCategory c) { this.category = c; }
    public String getSubtasks() { return subtasks; }
    public void setSubtasks(String s) { this.subtasks = s; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate d) { this.dueDate = d; }
}