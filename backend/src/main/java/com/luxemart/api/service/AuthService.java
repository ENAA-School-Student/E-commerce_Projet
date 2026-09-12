package com.luxemart.api.service;

import com.luxemart.api.dto.AuthRequest;
import com.luxemart.api.dto.AuthResponse;
import com.luxemart.api.dto.RegisterRequest;
import com.luxemart.api.dto.UserResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Role;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.RoleRepository;
import com.luxemart.api.repository.UserRepository;
import com.luxemart.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already registered");
        }

        Role customerRole = roleRepository.findByName(Role.RoleName.ROLE_CUSTOMER)
            .orElseThrow(() -> new ResourceNotFoundException("Customer role not found"));

        User user = User.builder()
            .firstName(request.firstName())
            .lastName(request.lastName())
            .email(request.email().toLowerCase().trim())
            .password(passwordEncoder.encode(request.password()))
            .phone(request.phone())
            .enabled(true)
            .build();
        user.getRoles().add(customerRole);

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(org.springframework.security.core.userdetails.User
            .withUsername(saved.getEmail())
            .password(saved.getPassword())
            .authorities("ROLE_CUSTOMER")
            .build(), saved.getId());

        return AuthResponse.of(token, UserResponse.from(saved));
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!user.getEnabled()) {
            throw new BadRequestException("Account disabled. Contact support.");
        }

        String token = jwtService.generateToken(
            org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new))
                .build(),
            user.getId()
        );

        return AuthResponse.of(token, UserResponse.from(user));
    }
}