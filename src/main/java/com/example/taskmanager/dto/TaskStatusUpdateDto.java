package com.example.taskmanager.dto;
import com.example.taskmanager.entity.TaskStatus;

public class TaskStatusUpdateDto {
    private TaskStatus status;
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus s) { this.status = s; }
}