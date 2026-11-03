package com.luxemart.api.service;

import com.luxemart.api.dto.AuthRequest;
import com.luxemart.api.dto.RegisterRequest;
import com.luxemart.api.dto.UserResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.InvalidRefreshTokenException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Role;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.RoleRepository;
import com.luxemart.api.repository.UserRepository;
import com.luxemart.api.security.JwtService;
import com.luxemart.api.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public IssuedTokens register(RegisterRequest request) {
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

        return issue(userRepository.save(user));
    }

    public IssuedTokens login(AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!user.getEnabled()) {
            throw new BadRequestException("Account disabled. Contact support.");
        }

        return issue(user);
    }

    /** Rotation: the presented refresh token is traded for a brand new access + refresh pair. */
    public IssuedTokens refresh(String refreshToken) {
        return issue(resolveRefreshToken(refreshToken));
    }

    private User resolveRefreshToken(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new InvalidRefreshTokenException();
        }
        try {
            User user = userRepository.findByEmail(jwtService.extractUsername(refreshToken))
                .orElseThrow(InvalidRefreshTokenException::new);

            UserPrincipal principal = UserPrincipal.create(user);
            if (!principal.isEnabled() || !jwtService.isRefreshTokenValid(refreshToken, principal)) {
                throw new InvalidRefreshTokenException();
            }
            return user;
        } catch (InvalidRefreshTokenException ex) {
            throw ex;
        } catch (Exception ex) {
            // Any parsing failure (expired, forged, wrong claim shape) reads the same from the client's side.
            throw new InvalidRefreshTokenException();
        }
    }

    private IssuedTokens issue(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        return new IssuedTokens(
            jwtService.generateAccessToken(principal, user.getId()),
            jwtService.generateRefreshToken(principal, user.getId()),
            UserResponse.from(user)
        );
    }
}
