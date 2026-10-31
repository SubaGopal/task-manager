package com.example.taskmanager.service;

import com.example.taskmanager.dto.AiBreakdownRequestDto;
import com.example.taskmanager.dto.AiBreakdownResponseDto;
import com.example.taskmanager.dto.AiParsePromptRequestDto;
import com.example.taskmanager.dto.AiParsePromptResponseDto;

public interface AiService {
    AiBreakdownResponseDto generateSubtasks(AiBreakdownRequestDto request);
    AiParsePromptResponseDto parseNaturalLanguagePrompt(AiParsePromptRequestDto request);
}