package com.example.taskmanager.controller;
import com.example.taskmanager.dto.AuthRequestDto;
import com.example.taskmanager.dto.AuthResponseDto;
import com.example.taskmanager.dto.RegisterRequestDto;
import com.example.taskmanager.entity.User;
import com.example.taskmanager.repository.UserRepository;
import com.example.taskmanager.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDto dto) {
        if (dto.getUsername() == null || dto.getUsername().trim().isEmpty()
            || dto.getPassword() == null || dto.getPassword().trim().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password required!"));
        if (userRepository.existsByUsername(dto.getUsername().trim()))
            return ResponseEntity.badRequest().body(Map.of("message", "Username already taken!"));
        User user = new User(
            dto.getUsername().trim(),
            dto.getEmail() != null ? dto.getEmail().trim() : dto.getUsername() + "@taskmanager.local",
            passwordEncoder.encode(dto.getPassword().trim())
        );
        userRepository.save(user);
        return ResponseEntity.ok(new AuthResponseDto(jwtUtil.generateToken(user.getUsername()), user.getUsername(), user.getEmail()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequestDto dto) {
        User user = userRepository.findByUsername(dto.getUsername()).orElse(null);
        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword()))
            return ResponseEntity.status(401).body(Map.of("message", "Invalid username or password!"));
        return ResponseEntity.ok(new AuthResponseDto(jwtUtil.generateToken(user.getUsername()), user.getUsername(), user.getEmail()));
    }
}