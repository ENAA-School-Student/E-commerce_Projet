package com.luxemart.api.controller;

import com.luxemart.api.dto.AddressDTO;
import com.luxemart.api.dto.UpdateUserRequest;
import com.luxemart.api.dto.UserResponse;
import com.luxemart.api.security.SecurityUtils;
import com.luxemart.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe() {
        return ResponseEntity.ok(userService.getCurrentUser(SecurityUtils.getCurrentUserId()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateProfile(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/me/addresses")
    public ResponseEntity<List<AddressDTO>> getAddresses() {
        return ResponseEntity.ok(userService.getAddresses(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<AddressDTO> addAddress(@Valid @RequestBody AddressDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(userService.addAddress(SecurityUtils.getCurrentUserId(), dto));
    }

    @PutMapping("/me/addresses/{addressId}")
    public ResponseEntity<AddressDTO> updateAddress(@PathVariable Long addressId, @Valid @RequestBody AddressDTO dto) {
        return ResponseEntity.ok(userService.updateAddress(SecurityUtils.getCurrentUserId(), addressId, dto));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    public ResponseEntity<Void> deleteAddress(@PathVariable Long addressId) {
        userService.deleteAddress(SecurityUtils.getCurrentUserId(), addressId);
        return ResponseEntity.noContent().build();
    }
}