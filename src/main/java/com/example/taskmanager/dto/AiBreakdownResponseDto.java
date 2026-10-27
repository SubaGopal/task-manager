package com.example.taskmanager.dto;

import java.util.List;

public class AiBreakdownResponseDto {
    private List<String> subtasks;
    private String suggestedCategory;
    private String suggestedPriority;

    public AiBreakdownResponseDto() {}
    public AiBreakdownResponseDto(List<String> subtasks, String suggestedCategory, String suggestedPriority) {
        this.subtasks = subtasks;
        this.suggestedCategory = suggestedCategory;
        this.suggestedPriority = suggestedPriority;
    }

    public List<String> getSubtasks() { return subtasks; }
    public void setSubtasks(List<String> subtasks) { this.subtasks = subtasks; }
    public String getSuggestedCategory() { return suggestedCategory; }
    public void setSuggestedCategory(String suggestedCategory) { this.suggestedCategory = suggestedCategory; }
    public String getSuggestedPriority() { return suggestedPriority; }
    public void setSuggestedPriority(String suggestedPriority) { this.suggestedPriority = suggestedPriority; }
}