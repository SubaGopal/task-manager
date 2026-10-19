package com.example.taskmanager.service;

import com.example.taskmanager.dto.TaskRequestDto;
import com.example.taskmanager.dto.TaskResponseDto;
import com.example.taskmanager.dto.TaskStatusUpdateDto;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.exception.ResourceNotFoundException;
import com.example.taskmanager.repository.TaskRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;

    public TaskServiceImpl(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Override
    public TaskResponseDto createTask(TaskRequestDto requestDto) {
        Task task = new Task();
        task.setTitle(requestDto.getTitle().trim());
        task.setDescription(requestDto.getDescription());
        task.setStatus(requestDto.getStatus() != null ? requestDto.getStatus() : TaskStatus.PENDING);
        task.setPriority(requestDto.getPriority() != null ? requestDto.getPriority() : TaskPriority.MEDIUM);
        task.setDueDate(requestDto.getDueDate());
        return TaskResponseDto.fromEntity(taskRepository.save(task));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponseDto> getTasks(TaskStatus status, TaskPriority priority, String search, String sortBy, String direction) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String sortProperty = "createdAt";
        if ("dueDate".equalsIgnoreCase(sortBy)) sortProperty = "dueDate";
        else if ("priority".equalsIgnoreCase(sortBy)) sortProperty = "priority";
        else if ("title".equalsIgnoreCase(sortBy)) sortProperty = "title";

        Sort.Direction sortDir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(sortDir, sortProperty);

        return taskRepository.findWithFilters(status, priority, cleanSearch, sort)
                .stream()
                .map(TaskResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponseDto getTaskById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        return TaskResponseDto.fromEntity(task);
    }

    @Override
    public TaskResponseDto updateTask(Long id, TaskRequestDto requestDto) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        task.setTitle(requestDto.getTitle().trim());
        task.setDescription(requestDto.getDescription());
        if (requestDto.getStatus() != null) task.setStatus(requestDto.getStatus());
        if (requestDto.getPriority() != null) task.setPriority(requestDto.getPriority());
        task.setDueDate(requestDto.getDueDate());
        return TaskResponseDto.fromEntity(taskRepository.save(task));
    }

    @Override
    public TaskResponseDto updateTaskStatus(Long id, TaskStatusUpdateDto statusDto) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        task.setStatus(statusDto.getStatus());
        return TaskResponseDto.fromEntity(taskRepository.save(task));
    }

    @Override
    public void deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        taskRepository.delete(task);
    }
}
