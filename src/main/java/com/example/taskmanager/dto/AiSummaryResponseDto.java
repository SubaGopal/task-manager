package com.example.taskmanager.dto;

public class AiSummaryResponseDto {
    private String greeting;
    private String summary;
    private String coachAdvice;
    private String priorityFocus;
    private int productivityScore;

    public AiSummaryResponseDto() {}
    public AiSummaryResponseDto(String greeting, String summary, String coachAdvice, String priorityFocus, int productivityScore) {
        this.greeting = greeting;
        this.summary = summary;
        this.coachAdvice = coachAdvice;
        this.priorityFocus = priorityFocus;
        this.productivityScore = productivityScore;
    }

    public String getGreeting() { return greeting; }
    public void setGreeting(String greeting) { this.greeting = greeting; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getCoachAdvice() { return coachAdvice; }
    public void setCoachAdvice(String coachAdvice) { this.coachAdvice = coachAdvice; }
    public String getPriorityFocus() { return priorityFocus; }
    public void setPriorityFocus(String priorityFocus) { this.priorityFocus = priorityFocus; }
    public int getProductivityScore() { return productivityScore; }
    public void setProductivityScore(int productivityScore) { this.productivityScore = productivityScore; }
}