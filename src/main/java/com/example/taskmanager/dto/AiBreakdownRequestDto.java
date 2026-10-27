package com.example.taskmanager.dto;

public class AiBreakdownRequestDto {
    private String title;
    private String description;

    public AiBreakdownRequestDto() {}
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}