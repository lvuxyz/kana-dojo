package com.japanese.learning.security;

import com.japanese.learning.domain.enums.Role;

/**
 * Danh tính đã xác thực nằm trong SecurityContext.
 * Mọi endpoint cần đăng nhập lấy userId từ đây, không bao giờ từ body hay query string.
 */
public record AppUserPrincipal(Long id, String email, String username, Role role) {
}
