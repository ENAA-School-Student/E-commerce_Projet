package com.luxemart.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;

import java.io.IOException;
import java.time.OffsetDateTime;

/** Writes RFC 7807 problem responses from servlet filters and interceptors, outside MVC advice reach. */
final class ProblemResponses {

    private ProblemResponses() {}

    static void write(ObjectMapper objectMapper, HttpServletResponse response, HttpStatus status,
                      String title, String detail) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setProperty("timestamp", OffsetDateTime.now());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), problem);
    }
}
