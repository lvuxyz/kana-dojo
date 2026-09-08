package com.japanese.learning.security;

import jakarta.servlet.http.HttpServletRequest;

/** Địa chỉ IP thật của client khi ứng dụng đứng sau reverse proxy. */
public final class ClientIpResolver {

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Phần tử đầu tiên là client gốc, các phần sau là chuỗi proxy.
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
