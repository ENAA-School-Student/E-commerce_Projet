package com.luxemart.api.dto;

import com.luxemart.api.model.Address;
import jakarta.validation.constraints.NotBlank;

public record AddressDTO(
    Long id,
    @NotBlank String firstName,
    @NotBlank String lastName,
    String phone,
    @NotBlank String street,
    String apartment,
    @NotBlank String city,
    String state,
    @NotBlank String zipCode,
    @NotBlank String country,
    Boolean isDefault
) {
    public static AddressDTO from(Address address) {
        return new AddressDTO(
            address.getId(),
            address.getFirstName(),
            address.getLastName(),
            address.getPhone(),
            address.getStreet(),
            address.getApartment(),
            address.getCity(),
            address.getState(),
            address.getZipCode(),
            address.getCountry(),
            address.getIsDefault()
        );
    }
}