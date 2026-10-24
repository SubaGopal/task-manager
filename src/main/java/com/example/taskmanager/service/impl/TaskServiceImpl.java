package com.example.taskmanager.service.impl;

import com.example.taskmanager.dto.TaskRequestDto;
import com.example.taskmanager.dto.TaskResponseDto;
import com.example.taskmanager.dto.TaskStatusUpdateDto;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.entity.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskServiceImpl implements TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Override
    public TaskResponseDto createTask(TaskRequestDto dto, User user) {
        Task task = new Task();
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : TaskPriority.MEDIUM);
        task.setCategory(dto.getCategory() != null ? dto.getCategory() : TaskCategory.WORK);
        task.setSubtasks(dto.getSubtasks() != null ? dto.getSubtasks() : "[]");
        task.setDueDate(dto.getDueDate());
        task.setStatus(TaskStatus.PENDING);
        task.setUser(user);
        return mapToDto(taskRepository.save(task));
    }

    @Override
    public TaskResponseDto getTaskById(Long id, User user) {
        Task task = taskRepository.findById(id)
                .filter(t -> t.getUser() == null || t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        return mapToDto(task);
    }

    @Override
    public List<TaskResponseDto> getAllTasks(User user, TaskStatus status, TaskPriority priority,
            TaskCategory category, String search, String sortBy, String sortDir) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = (sortBy != null && !sortBy.trim().isEmpty()) ? sortBy : "createdAt";
        Sort sort = Sort.by(direction, property);
        return taskRepository.findFilteredTasks(user.getId(), status, priority, category, search, sort)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public TaskResponseDto updateTask(Long id, TaskRequestDto dto, User user) {
        Task task = taskRepository.findById(id)
                .filter(t -> t.getUser() == null || t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        if (dto.getPriority() != null) task.setPriority(dto.getPriority());
        if (dto.getCategory() != null) task.setCategory(dto.getCategory());
        if (dto.getSubtasks() != null) task.setSubtasks(dto.getSubtasks());
        task.setDueDate(dto.getDueDate());
        return mapToDto(taskRepository.save(task));
    }

    @Override
    public TaskResponseDto updateTaskStatus(Long id, TaskStatusUpdateDto dto, User user) {
        Task task = taskRepository.findById(id)
                .filter(t -> t.getUser() == null || t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        task.setStatus(dto.getStatus());
        return mapToDto(taskRepository.save(task));
    }

    @Override
    public void deleteTask(Long id, User user) {
        Task task = taskRepository.findById(id)
                .filter(t -> t.getUser() == null || t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        taskRepository.delete(task);
    }

    private TaskResponseDto mapToDto(Task task) {
        return new TaskResponseDto(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getPriority(),
            task.getCategory(),
            task.getSubtasks(),
            task.getDueDate(),
            task.getCreatedAt(),
            task.getUpdatedAt()
        );
    }
}