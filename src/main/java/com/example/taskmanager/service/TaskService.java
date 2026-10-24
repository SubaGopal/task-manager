package com.example.taskmanager.service;
import com.example.taskmanager.dto.TaskRequestDto;
import com.example.taskmanager.dto.TaskResponseDto;
import com.example.taskmanager.dto.TaskStatusUpdateDto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.entity.User;
import java.util.List;

public interface TaskService {
    TaskResponseDto createTask(TaskRequestDto dto, User user);
    TaskResponseDto getTaskById(Long id, User user);
    List<TaskResponseDto> getAllTasks(User user, TaskStatus status, TaskPriority priority,
        TaskCategory category, String search, String sortBy, String sortDir);
    TaskResponseDto updateTask(Long id, TaskRequestDto dto, User user);
    TaskResponseDto updateTaskStatus(Long id, TaskStatusUpdateDto dto, User user);
    void deleteTask(Long id, User user);
}