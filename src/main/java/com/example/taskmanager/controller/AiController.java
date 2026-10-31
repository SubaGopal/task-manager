package com.example.taskmanager.controller;

import com.example.taskmanager.dto.*;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @Autowired
    private TaskRepository taskRepository;

    @PostMapping("/breakdown")
    public ResponseEntity<AiBreakdownResponseDto> getBreakdown(@RequestBody AiBreakdownRequestDto dto) {
        return ResponseEntity.ok(aiService.generateSubtasks(dto));
    }

    @PostMapping("/parse-prompt")
    public ResponseEntity<AiParsePromptResponseDto> parsePrompt(@RequestBody AiParsePromptRequestDto dto) {
        return ResponseEntity.ok(aiService.parseNaturalLanguagePrompt(dto));
    }

    @GetMapping("/summary")
    public ResponseEntity<AiSummaryResponseDto> getExecutiveSummary(@AuthenticationPrincipal User user) {
        List<Task> tasks = user != null ? taskRepository.findByUserId(user.getId()) : List.of();
        return ResponseEntity.ok(aiService.getDailyExecutiveSummary(user, tasks));
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponseDto> chatWithTasks(@RequestBody AiChatRequestDto dto,
                                                           @AuthenticationPrincipal User user) {
        List<Task> tasks = user != null ? taskRepository.findByUserId(user.getId()) : List.of();
        return ResponseEntity.ok(aiService.chatWithTasks(user, tasks, dto));
    }
}