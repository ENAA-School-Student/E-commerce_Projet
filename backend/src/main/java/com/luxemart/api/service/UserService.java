package com.luxemart.api.service;

import com.luxemart.api.dto.AddressDTO;
import com.luxemart.api.dto.UpdateUserRequest;
import com.luxemart.api.dto.UserResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Address;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.AddressRepository;
import com.luxemart.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getCurrentUser(Long userId) {
        return UserResponse.from(getUserById(userId));
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateUserRequest request) {
        User user = getUserById(userId);

        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl());
        }
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new BadRequestException("Current password is incorrect");
            }
            user.setPassword(passwordEncoder.encode(request.newPassword()));
        }

        return UserResponse.from(userRepository.save(user));
    }

    public List<AddressDTO> getAddresses(Long userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDesc(userId).stream()
            .map(AddressDTO::from)
            .collect(Collectors.toList());
    }

    @Transactional
    public AddressDTO addAddress(Long userId, AddressDTO dto) {
        User user = getUserById(userId);
        List<Address> existing = addressRepository.findByUserIdOrderByIsDefaultDesc(userId);
        if (existing.isEmpty() || Boolean.TRUE.equals(dto.isDefault())) {
            existing.forEach(a -> a.setIsDefault(false));
            addressRepository.saveAll(existing);
        }
        Address address = Address.builder()
            .firstName(dto.firstName())
            .lastName(dto.lastName())
            .phone(dto.phone())
            .street(dto.street())
            .apartment(dto.apartment())
            .city(dto.city())
            .state(dto.state())
            .zipCode(dto.zipCode())
            .country(dto.country())
            .isDefault(existing.isEmpty() || Boolean.TRUE.equals(dto.isDefault()))
            .user(user)
            .build();
        return AddressDTO.from(addressRepository.save(address));
    }

    @Transactional
    public AddressDTO updateAddress(Long userId, Long addressId, AddressDTO dto) {
        Address address = getAddressForUser(userId, addressId);

        if (Boolean.TRUE.equals(dto.isDefault())) {
            List<Address> all = addressRepository.findByUserIdOrderByIsDefaultDesc(userId);
            all.forEach(a -> {
                if (!a.getId().equals(addressId)) a.setIsDefault(false);
            });
            addressRepository.saveAll(all);
        }

        address.setFirstName(dto.firstName());
        address.setLastName(dto.lastName());
        address.setPhone(dto.phone());
        address.setStreet(dto.street());
        address.setApartment(dto.apartment());
        address.setCity(dto.city());
        address.setState(dto.state());
        address.setZipCode(dto.zipCode());
        address.setCountry(dto.country());
        address.setIsDefault(Boolean.TRUE.equals(dto.isDefault()));

        return AddressDTO.from(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        Address address = getAddressForUser(userId, addressId);
        addressRepository.delete(address);
    }

    private Address getAddressForUser(Long userId, Long addressId) {
        return addressRepository.findById(addressId)
            .filter(a -> a.getUser().getId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
    }
}