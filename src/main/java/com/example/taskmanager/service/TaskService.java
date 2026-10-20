package com.example.taskmanager.service;
import com.example.taskmanager.dto.TaskRequestDto;
import com.example.taskmanager.dto.TaskResponseDto;
import com.example.taskmanager.dto.TaskStatusUpdateDto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import java.util.List;
public interface TaskService {
    TaskResponseDto createTask(TaskRequestDto requestDto);
    List<TaskResponseDto> getTasks(TaskStatus status, TaskPriority priority, TaskCategory category, String search, String sortBy, String direction);
    TaskResponseDto getTaskById(Long id);
    TaskResponseDto updateTask(Long id, TaskRequestDto requestDto);
    TaskResponseDto updateTaskStatus(Long id, TaskStatusUpdateDto statusDto);
    void deleteTask(Long id);
}