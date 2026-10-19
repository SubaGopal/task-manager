package com.example.taskmanager.dto;

import com.example.taskmanager.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;

public class TaskStatusUpdateDto {
    @NotNull(message = "Status is required")
    private TaskStatus status;

    public TaskStatusUpdateDto() {}
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
}
