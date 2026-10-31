package com.example.taskmanager.service.impl;

import com.example.taskmanager.dto.*;
import com.example.taskmanager.entity.Task;
import com.example.taskmanager.entity.TaskStatus;
import com.example.taskmanager.entity.User;
import com.example.taskmanager.service.AiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

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

        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("YOUR_GEMINI_KEY")) {
            try {
                LocalDate today = LocalDate.now();
                String systemPrompt = "You are a smart task scheduler. The current date is " + today.toString() + ". "
                        + "Extract details from this spoken task instruction: \"" + prompt + "\". "
                        + "Extract: "
                        + "1. \"title\": clear, cleaned-up task title without date or priority keywords. "
                        + "2. \"description\": any extra details or leave as empty string. "
                        + "3. \"category\": one of WORK, PERSONAL, STUDY, HEALTH, FINANCE, OTHER. "
                        + "4. \"priority\": one of LOW, MEDIUM, HIGH. "
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

        return parsePromptHeuristically(prompt);
    }

    @Override
    public AiSummaryResponseDto getDailyExecutiveSummary(User user, List<Task> tasks) {
        String name = user != null ? user.getUsername() : "Suba";
        int hour = LocalTime.now().getHour();
        String greeting = hour < 12 ? "Good morning " + name + "! 🌅" : (hour < 17 ? "Good afternoon " + name + "! ☀️" : "Good evening " + name + "! 🌙");

        int total = tasks.size();
        long completed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
        long pending = total - completed;

        LocalDate today = LocalDate.now();
        List<Task> overdue = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED && t.getDueDate() != null && t.getDueDate().isBefore(today))
                .collect(Collectors.toList());

        List<Task> dueToday = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED && t.getDueDate() != null && t.getDueDate().isEqual(today))
                .collect(Collectors.toList());

        List<Task> highPriority = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED && "HIGH".equalsIgnoreCase(t.getPriority().name()))
                .collect(Collectors.toList());

        int score = total > 0 ? (int) Math.round(((double) completed / total) * 100) : 100;

        String summary;
        String advice;
        String focus;

        if (total == 0) {
            summary = "You currently have no tasks scheduled. It's a fresh canvas!";
            advice = "Click 'Create New Task' or use Voice-to-Task to plan your upcoming goals.";
            focus = "Set a goal for today";
        } else if (!overdue.isEmpty()) {
            summary = "Alert: You have " + overdue.size() + " overdue task(s) and " + dueToday.size() + " due today.";
            advice = "Recommendation: Focus on clearing '" + overdue.get(0).getTitle() + "' first to eliminate backlog stress!";
            focus = overdue.get(0).getTitle();
        } else if (!dueToday.isEmpty()) {
            summary = "You have " + dueToday.size() + " task(s) scheduled for today, with " + highPriority.size() + " high-priority item(s).";
            advice = "Recommendation: Tackle '" + dueToday.get(0).getTitle() + "' before afternoon to build strong momentum!";
            focus = dueToday.get(0).getTitle();
        } else if (!highPriority.isEmpty()) {
            summary = "Great job, no tasks are overdue! You have " + highPriority.size() + " high-priority task(s) in progress.";
            advice = "Recommendation: Focus your energy on '" + highPriority.get(0).getTitle() + "'.";
            focus = highPriority.get(0).getTitle();
        } else {
            summary = "All current tasks are in good standing (" + completed + "/" + total + " completed)! Completion score: " + score + "%.";
            advice = "Keep up the excellent consistency! Take a quick break or plan ahead for the rest of the week.";
            focus = pending > 0 ? "Review pending tasks" : "All goals accomplished! 🎉";
        }

        return new AiSummaryResponseDto(greeting, summary, advice, focus, score);
    }

    @Override
    public AiChatResponseDto chatWithTasks(User user, List<Task> tasks, AiChatRequestDto request) {
        String msg = request.getMessage() != null ? request.getMessage().trim() : "";
        if (msg.isEmpty()) {
            return new AiChatResponseDto("Hello! Ask me anything about your tasks, deadlines, or recommendations!");
        }

        // Try Gemini if key is provided
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("YOUR_GEMINI_KEY")) {
            try {
                StringBuilder taskContext = new StringBuilder();
                tasks.forEach(t -> taskContext.append(String.format("- [%s] %s | Priority: %s | Category: %s | Due: %s\n",
                        t.getStatus(), t.getTitle(), t.getPriority(), t.getCategory(), t.getDueDate())));

                String prompt = "You are an intelligent task manager assistant for user " + (user != null ? user.getUsername() : "Suba") + ".\n"
                        + "Here is the user's current list of tasks:\n" + taskContext.toString() + "\n"
                        + "User question (may be in English, Tamil, or Tanglish): \"" + msg + "\"\n"
                        + "Give a concise, helpful, friendly answer referencing their exact tasks. Answer in the same language/tone.";

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
                    String answer = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText().trim();
                    return new AiChatResponseDto(answer);
                }
            } catch (Exception e) {
                System.err.println("Gemini Chat failed, using high-precision fallback engine: " + e.getMessage());
            }
        }

        // High-precision Smart Heuristic Fallback Engine
        return new AiChatResponseDto(answerTaskQueryHeuristically(msg, tasks));
    }

    private String answerTaskQueryHeuristically(String query, List<Task> tasks) {
        String lower = query.toLowerCase();
        LocalDate today = LocalDate.now();

        // Overdue query
        if (lower.contains("overdue") || lower.contains("late") || lower.contains("pending date")) {
            List<Task> overdue = tasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.COMPLETED && t.getDueDate() != null && t.getDueDate().isBefore(today))
                    .collect(Collectors.toList());
            if (overdue.isEmpty()) {
                return "🎉 Excellent news! You have ZERO overdue tasks right now. Everything is right on track!";
            } else {
                StringBuilder sb = new StringBuilder("⚠️ You have " + overdue.size() + " overdue task(s):\n");
                overdue.forEach(t -> sb.append("• ").append(t.getTitle()).append(" (Due: ").append(t.getDueDate()).append(")\n"));
                sb.append("Consider tackling these first!");
                return sb.toString();
            }
        }

        // Category queries (Study, Work, Health, Finance, etc.)
        for (String cat : List.of("study", "work", "health", "finance", "personal")) {
            if (lower.contains(cat)) {
                List<Task> matched = tasks.stream()
                        .filter(t -> t.getCategory().name().equalsIgnoreCase(cat) && t.getStatus() != TaskStatus.COMPLETED)
                        .collect(Collectors.toList());
                if (matched.isEmpty()) {
                    return "You have no pending " + cat.toUpperCase() + " tasks! All clear! ✨";
                }
                StringBuilder sb = new StringBuilder("Here are your pending " + cat.toUpperCase() + " tasks (" + matched.size() + "):\n");
                matched.forEach(t -> sb.append("• ").append(t.getTitle()).append(" [Priority: ").append(t.getPriority()).append("]\n"));
                return sb.toString();
            }
        }

        // Next / What to focus on / Priority
        if (lower.contains("focus") || lower.contains("next") || lower.contains("first") || lower.contains("important") || lower.contains("urgent")) {
            Optional<Task> top = tasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.COMPLETED)
                    .sorted((a, b) -> {
                        if ("HIGH".equalsIgnoreCase(a.getPriority().name())) return -1;
                        if ("HIGH".equalsIgnoreCase(b.getPriority().name())) return 1;
                        return 0;
                    })
                    .findFirst();
            if (top.isPresent()) {
                Task t = top.get();
                return "🎯 Top Recommendation: You should focus on **\"" + t.getTitle() + "\"** (" + t.getCategory() + " · Priority: " + t.getPriority() + "). It requires your immediate attention!";
            } else {
                return "All your tasks are completed! You're free to relax or create a new goal! 🚀";
            }
        }

        // Summary / Count
        long completed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
        long pending = tasks.size() - completed;
        return "📊 Task Overview:\n• Total Tasks: " + tasks.size() + "\n• In Progress: " + pending + "\n• Completed: " + completed + "\n\nAsk me anytime about specific categories, overdue items, or what to do next!";
    }

    private AiParsePromptResponseDto parsePromptHeuristically(String prompt) {
        String lower = prompt.toLowerCase();
        LocalDate targetDate = LocalDate.now();

        if (lower.contains("tomorrow") || lower.contains("naalaikku") || lower.contains("nalaiku")) {
            targetDate = targetDate.plusDays(1);
        } else if (lower.contains("day after tomorrow") || lower.contains("nalaniki")) {
            targetDate = targetDate.plusDays(2);
        } else if (lower.contains("next week") || lower.contains("adutha vaaram")) {
            targetDate = targetDate.plusWeeks(1);
        } else if (lower.contains("after 3 days") || lower.contains("in 3 days")) {
            targetDate = targetDate.plusDays(3);
        }

        String priority = "MEDIUM";
        if (lower.contains("urgent") || lower.contains("high") || lower.contains("mukkiyam") || lower.contains("critical") || lower.contains("asap")) {
            priority = "HIGH";
        } else if (lower.contains("low") || lower.contains("later") || lower.contains("slow")) {
            priority = "LOW";
        }

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