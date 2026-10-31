package com.example.taskmanager.dto;

import java.util.List;

public class AiParsePromptResponseDto {
    private String title;
    private String description;
    private String category;
    private String priority;
    private String dueDate;
    private List<String> subtasks;

    public AiParsePromptResponseDto() {}
    public AiParsePromptResponseDto(String title, String description, String category, String priority, String dueDate, List<String> subtasks) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.dueDate = dueDate;
        this.subtasks = subtasks;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    public List<String> getSubtasks() { return subtasks; }
    public void setSubtasks(List<String> subtasks) { this.subtasks = subtasks; }
}