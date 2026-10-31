package com.example.taskmanager.dto;

public class AiChatResponseDto {
    private String reply;

    public AiChatResponseDto() {}
    public AiChatResponseDto(String reply) {
        this.reply = reply;
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
}