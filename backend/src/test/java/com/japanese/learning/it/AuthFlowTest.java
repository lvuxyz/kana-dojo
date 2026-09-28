package com.japanese.learning.it;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Đăng ký, refresh token xoay vòng, phát hiện tái sử dụng và đăng xuất (SPEC §1, §6). */
class AuthFlowTest extends IntegrationTest {

    @Test
    @DisplayName("Refresh trả cặp token mới và token cũ không dùng lại được")
    void refreshRotatesToken() throws Exception {
        TestUser user = register();

        JsonNode rotated = body(refresh(user.refreshToken()).andExpect(status().isOk()));
        String next = rotated.get("refreshToken").asText();

        assertThat(next).isNotBlank().isNotEqualTo(user.refreshToken());
        assertThat(rotated.get("accessToken").asText()).isNotBlank();
        assertThat(count("select count(*) from refresh_tokens where user_id = ? and revoked_at is null", user.id()))
                .as("chỉ token mới nhất còn hiệu lực").isEqualTo(1);
    }

    @Test
    @DisplayName("Dùng lại token đã bị thay thế thì thu hồi cả họ token, kể cả token mới nhất")
    void reuseRevokesWholeFamily() throws Exception {
        TestUser user = register();
        String second = body(refresh(user.refreshToken()).andExpect(status().isOk()))
                .get("refreshToken").asText();

        // Kẻ trộm trình lại token cũ đã bị thay thế.
        refresh(user.refreshToken()).andExpect(status().isUnauthorized());

        // Người dùng thật (đang giữ token mới nhất) cũng bị buộc đăng nhập lại.
        refresh(second).andExpect(status().isUnauthorized());
        assertThat(count("select count(*) from refresh_tokens where user_id = ? and revoked_at is null", user.id()))
                .isZero();
    }

    @Test
    @DisplayName("Đăng xuất chỉ thu hồi phiên hiện tại, không đụng thiết bị khác")
    void logoutRevokesOnlyThatSession() throws Exception {
        TestUser user = register();
        String otherDevice = body(mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "emailOrUsername", username(user), "password", "matkhau123"))))
                .andExpect(status().isOk()))
                .get("refreshToken").asText();

        postAs(user, "/api/v1/auth/logout", Map.of("refreshToken", user.refreshToken()))
                .andExpect(status().isNoContent());

        refresh(user.refreshToken()).andExpect(status().isUnauthorized());
        refresh(otherDevice).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Chỉ lưu hash SHA-256 của refresh token, không lưu bản rõ")
    void storesOnlyTokenHash() throws Exception {
        TestUser user = register();
        String storedHash = jdbc.queryForObject(
                "select token_hash from refresh_tokens where user_id = ?", String.class, user.id());

        assertThat(storedHash).hasSize(64).isNotEqualTo(user.refreshToken());
        assertThat(count("select count(*) from refresh_tokens where token_hash = ?", user.refreshToken())).isZero();
    }

    @Test
    @DisplayName("Endpoint cần đăng nhập trả 401 dạng Problem Details khi thiếu token")
    void protectedEndpointNeedsToken() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));

        TestUser user = register();
        getAs(user, "/api/v1/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.id()))
                .andExpect(jsonPath("$.plan").value("FREE"));
    }

    @Test
    @DisplayName("Email trùng trả 409 kèm lỗi theo từng trường")
    void duplicateEmailIsConflict() throws Exception {
        TestUser user = register();
        String name = username(user);

        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", name + "@test.local",
                                "username", name + "x",
                                "password", "matkhau123",
                                "displayName", "Trùng email"))))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.email").exists());
    }

    private ResultActions refresh(String refreshToken) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("refreshToken", refreshToken))));
    }

    private String username(TestUser user) {
        return jdbc.queryForObject("select username from users where id = ?", String.class, user.id());
    }
}
