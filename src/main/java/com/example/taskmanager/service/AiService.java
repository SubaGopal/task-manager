package com.example.taskmanager.service;

import com.example.taskmanager.dto.AiBreakdownRequestDto;
import com.example.taskmanager.dto.AiBreakdownResponseDto;

public interface AiService {
    AiBreakdownResponseDto generateSubtasks(AiBreakdownRequestDto request);
}