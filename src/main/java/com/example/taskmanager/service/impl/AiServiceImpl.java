package com.example.taskmanager.service.impl;

import com.example.taskmanager.dto.AiBreakdownRequestDto;
import com.example.taskmanager.dto.AiBreakdownResponseDto;
import com.example.taskmanager.service.AiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiServiceImpl implements AiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public AiBreakdownResponseDto generateSubtasks(AiBreakdownRequestDto request) {
        String title = request.getTitle() != null ? request.getTitle().trim() : "";
        if (title.isEmpty()) {
            return new AiBreakdownResponseDto(Collections.emptyList(), "WORK", "MEDIUM");
        }

        // 1. If Gemini API Key is configured, call Google Gemini 1.5 Flash
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("YOUR_GEMINI_KEY")) {
            try {
                String prompt = "You are a productivity expert. Given the task title: \"" + title + "\", "
                        + "break it down into 4 to 5 concise, actionable subtask checklist steps. "
                        + "Also pick the single best category (WORK, PERSONAL, STUDY, HEALTH, FINANCE, OTHER) "
                        + "and priority (LOW, MEDIUM, HIGH). "
                        + "Respond ONLY with a valid raw JSON object with keys: "
                        + "\"subtasks\" (array of strings), \"suggestedCategory\" (string), \"suggestedPriority\" (string). "
                        + "Do NOT include markdown formatting or backticks.";

                String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey.trim();

                Map<String, Object> textPart = Map.of("text", prompt);
                Map<String, Object> parts = Map.of("parts", List.of(textPart));
                Map<String, Object> requestBody = Map.of("contents", List.of(parts));

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidate = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                    String rawText = candidate.asText().trim();

                    // Clean markdown code fence if present
                    if (rawText.startsWith("`")) {
                        rawText = rawText.replaceAll("(?s)^`[a-zA-Z]*\\n?", "").replaceAll("`$", "").trim();
                    }

                    JsonNode parsedJson = objectMapper.readTree(rawText);
                    List<String> subtasks = new ArrayList<>();
                    if (parsedJson.has("subtasks")) {
                        parsedJson.get("subtasks").forEach(node -> subtasks.add(node.asText()));
                    }
                    String cat = parsedJson.path("suggestedCategory").asText("WORK").toUpperCase();
                    String pri = parsedJson.path("suggestedPriority").asText("MEDIUM").toUpperCase();

                    return new AiBreakdownResponseDto(subtasks, cat, pri);
                }
            } catch (Exception e) {
                System.err.println("Gemini API call failed, falling back to smart heuristic: " + e.getMessage());
            }
        }

        // 2. Smart Built-in Fallback Engine (Immediate realistic breakdown even without API key)
        return generateSmartFallback(title);
    }

    private AiBreakdownResponseDto generateSmartFallback(String title) {
        String lower = title.toLowerCase();
        List<String> steps = new ArrayList<>();
        String cat = "WORK";
        String pri = "MEDIUM";

        if (lower.contains("interview") || lower.contains("study") || lower.contains("exam") || lower.contains("learn")) {
            cat = "STUDY";
            pri = "HIGH";
            steps.add("Review core fundamentals & cheat sheet");
            steps.add("Practice top 10 commonly asked technical questions");
            steps.add("Build a mini proof-of-concept project");
            steps.add("Conduct a mock session and self-assessment");
        } else if (lower.contains("security") || lower.contains("auth") || lower.contains("jwt") || lower.contains("api")) {
            cat = "WORK";
            pri = "HIGH";
            steps.add("Design entity models and repository interfaces");
            steps.add("Implement JWT token generator and authentication filter");
            steps.add("Configure Spring SecurityFilterChain and CORS policies");
            steps.add("Test registration, login and protected endpoints");
        } else if (lower.contains("health") || lower.contains("gym") || lower.contains("workout") || lower.contains("run")) {
            cat = "HEALTH";
            pri = "MEDIUM";
            steps.add("Warm-up & dynamic stretching (10 mins)");
            steps.add("Complete core training routine");
            steps.add("Cardio & cool-down recovery");
            steps.add("Hydrate and log progress in fitness tracker");
        } else if (lower.contains("budget") || lower.contains("tax") || lower.contains("finance") || lower.contains("bill")) {
            cat = "FINANCE";
            pri = "HIGH";
            steps.add("Gather all recent bills, receipts and invoices");
            steps.add("Calculate total income vs expenditure");
            steps.add("Allocate savings and emergency fund transfers");
            steps.add("Schedule automatic bill payments");
        } else {
            steps.add("Define scope and list requirements for: " + title);
            steps.add("Research best practices and gather necessary assets");
            steps.add("Execute phase 1 core implementation");
            steps.add("Review, verify and finalize deliverable");
        }

        return new AiBreakdownResponseDto(steps, cat, pri);
    }
}