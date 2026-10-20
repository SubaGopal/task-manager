package com.example.taskmanager.controller;
import com.example.taskmanager.dto.TaskRequestDto;
import com.example.taskmanager.dto.TaskResponseDto;
import com.example.taskmanager.dto.TaskStatusUpdateDto;
import com.example.taskmanager.entity.TaskCategory;
import com.example.taskmanager.entity.TaskPriority;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }
    @PostMapping
    public ResponseEntity<TaskResponseDto> createTask(@Valid @RequestBody TaskRequestDto requestDto) {
        return new ResponseEntity<>(taskService.createTask(requestDto), HttpStatus.CREATED);
    }
    @GetMapping
    public ResponseEntity<List<TaskResponseDto>> getTasks(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) TaskCategory category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        return ResponseEntity.ok(taskService.getTasks(status, priority, category, search, sortBy, direction));
    }
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDto> getTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }
    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDto> updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequestDto requestDto) {
        return ResponseEntity.ok(taskService.updateTask(id, requestDto));
    }
    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponseDto> updateStatus(@PathVariable Long id, @Valid @RequestBody TaskStatusUpdateDto dto) {
        return ResponseEntity.ok(taskService.updateTaskStatus(id, dto));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}