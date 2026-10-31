package com.example.taskmanager.service.impl;

import com.example.taskmanager.dto.*;
import com.example.taskmanager.service.AiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
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

        return generateSmartFallback(title);
    }

    @Override
    public AiParsePromptResponseDto parseNaturalLanguagePrompt(AiParsePromptRequestDto request) {
        String prompt = request.getPrompt() != null ? request.getPrompt().trim() : "";
        if (prompt.isEmpty()) {
            return new AiParsePromptResponseDto("New Task", "", "WORK", "MEDIUM", LocalDate.now().toString(), Collections.emptyList());
        }

        // 1. Try Gemini API if key is present
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("YOUR_GEMINI_KEY")) {
            try {
                LocalDate today = LocalDate.now();
                String systemPrompt = "You are a smart task scheduler. The current date is " + today.toString() + ". "
                        + "Extract details from this spoken task instruction: \"" + prompt + "\". "
                        + "Extract: "
                        + "1. \"title\": clear, cleaned-up task title without date or priority keywords. "
                        + "2. \"description\": any extra details or leave as empty string. "
                        + "3. \"category\": one of WORK, PERSONAL, STUDY, HEALTH, FINANCE, OTHER. "
                        + "4. \"priority\": one of LOW, MEDIUM, HIGH (if user mentioned urgent, critical, important -> HIGH). "
                        + "5. \"dueDate\": calculate YYYY-MM-DD from words like today, tomorrow, next week, or specific day. If unknown, use " + today.toString() + ". "
                        + "6. \"subtasks\": an array of 2-3 quick actionable steps. "
                        + "Respond ONLY with a valid raw JSON object with keys: title, description, category, priority, dueDate, subtasks. No markdown, no backticks.";

                String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey.trim();
                Map<String, Object> textPart = Map.of("text", systemPrompt);
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

                    if (rawText.startsWith("`")) {
                        rawText = rawText.replaceAll("(?s)^`[a-zA-Z]*\\n?", "").replaceAll("`$", "").trim();
                    }

                    JsonNode parsed = objectMapper.readTree(rawText);
                    List<String> subtasks = new ArrayList<>();
                    if (parsed.has("subtasks")) {
                        parsed.get("subtasks").forEach(node -> subtasks.add(node.asText()));
                    }

                    return new AiParsePromptResponseDto(
                            parsed.path("title").asText(prompt),
                            parsed.path("description").asText("Created via Smart Voice Assistant"),
                            parsed.path("category").asText("WORK").toUpperCase(),
                            parsed.path("priority").asText("MEDIUM").toUpperCase(),
                            parsed.path("dueDate").asText(today.toString()),
                            subtasks
                    );
                }
            } catch (Exception e) {
                System.err.println("Gemini NLP call failed, using built-in NLP engine: " + e.getMessage());
            }
        }

        // 2. High-Precision Smart Built-in NLP Engine (Works instantly with zero API key!)
        return parsePromptHeuristically(prompt);
    }

    private AiParsePromptResponseDto parsePromptHeuristically(String prompt) {
        String lower = prompt.toLowerCase();
        LocalDate targetDate = LocalDate.now();

        // Date calculation
        if (lower.contains("tomorrow") || lower.contains("naalaikku") || lower.contains("nalaiku")) {
            targetDate = targetDate.plusDays(1);
        } else if (lower.contains("day after tomorrow") || lower.contains("nalaniki")) {
            targetDate = targetDate.plusDays(2);
        } else if (lower.contains("next week") || lower.contains("adutha vaaram")) {
            targetDate = targetDate.plusWeeks(1);
        } else if (lower.contains("after 3 days") || lower.contains("in 3 days")) {
            targetDate = targetDate.plusDays(3);
        }

        // Priority calculation
        String priority = "MEDIUM";
        if (lower.contains("urgent") || lower.contains("high") || lower.contains("mukkiyam") || lower.contains("critical") || lower.contains("asap")) {
            priority = "HIGH";
        } else if (lower.contains("low") || lower.contains("later") || lower.contains("slow")) {
            priority = "LOW";
        }

        // Category calculation
        String category = "WORK";
        if (lower.contains("study") || lower.contains("exam") || lower.contains("learn") || lower.contains("read") || lower.contains("session") || lower.contains("college")) {
            category = "STUDY";
        } else if (lower.contains("gym") || lower.contains("doctor") || lower.contains("health") || lower.contains("medicine") || lower.contains("walk") || lower.contains("hospital")) {
            category = "HEALTH";
        } else if (lower.contains("finance") || lower.contains("money") || lower.contains("budget") || lower.contains("bank") || lower.contains("tax") || lower.contains("bill") || lower.contains("pay") || lower.contains("salary")) {
            category = "FINANCE";
        } else if (lower.contains("movie") || lower.contains("family") || lower.contains("home") || lower.contains("shop") || lower.contains("buy") || lower.contains("personal") || lower.contains("dinner")) {
            category = "PERSONAL";
        }

        // Clean task title
        String cleanTitle = prompt;
        String[] noiseWords = {
            "tomorrow evening", "tomorrow morning", "tomorrow", "day after tomorrow", "today", "next week",
            "high priority", "urgent priority", "low priority", "medium priority", "urgent", "asap",
            "kooda", "koodi", "vekkanum", "pannanum", "mudikkanum", "vaanganum", "category", "priority"
        };
        for (String noise : noiseWords) {
            cleanTitle = cleanTitle.replaceAll("(?i)\\b" + noise + "\\b", "");
        }
        cleanTitle = cleanTitle.replaceAll("\\s+", " ").trim();
        if (cleanTitle.length() < 3) cleanTitle = prompt;

        // Capitalize first letter
        cleanTitle = Character.toUpperCase(cleanTitle.charAt(0)) + cleanTitle.substring(1);

        List<String> subtasks = new ArrayList<>();
        subtasks.add("Prepare agenda & required items");
        subtasks.add("Execute main activity: " + cleanTitle);
        subtasks.add("Follow up and mark as completed");

        return new AiParsePromptResponseDto(
                cleanTitle,
                "Auto-extracted via Smart Voice: \"" + prompt + "\"",
                category,
                priority,
                targetDate.toString(),
                subtasks
        );
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