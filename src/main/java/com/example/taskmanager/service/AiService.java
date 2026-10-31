package com.example.taskmanager.service;

import com.example.taskmanager.dto.*;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.User;
import java.util.List;

public interface AiService {
    AiBreakdownResponseDto generateSubtasks(AiBreakdownRequestDto request);
    AiParsePromptResponseDto parseNaturalLanguagePrompt(AiParsePromptRequestDto request);
    AiSummaryResponseDto getDailyExecutiveSummary(User user, List<Task> tasks);
    AiChatResponseDto chatWithTasks(User user, List<Task> tasks, AiChatRequestDto request);
}