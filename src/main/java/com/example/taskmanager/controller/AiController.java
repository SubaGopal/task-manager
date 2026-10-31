package com.example.taskmanager.controller;

import com.example.taskmanager.dto.AiBreakdownRequestDto;
import com.example.taskmanager.dto.AiBreakdownResponseDto;
import com.example.taskmanager.dto.AiParsePromptRequestDto;
import com.example.taskmanager.dto.AiParsePromptResponseDto;
import com.example.taskmanager.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping("/breakdown")
    public ResponseEntity<AiBreakdownResponseDto> getBreakdown(@RequestBody AiBreakdownRequestDto dto) {
        return ResponseEntity.ok(aiService.generateSubtasks(dto));
    }

    @PostMapping("/parse-prompt")
    public ResponseEntity<AiParsePromptResponseDto> parsePrompt(@RequestBody AiParsePromptRequestDto dto) {
        return ResponseEntity.ok(aiService.parseNaturalLanguagePrompt(dto));
    }
}