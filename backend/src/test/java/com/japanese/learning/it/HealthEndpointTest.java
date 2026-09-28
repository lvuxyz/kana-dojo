package com.japanese.learning.it;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Healthcheck của Docker gọi endpoint này khi chưa đăng nhập. */
class HealthEndpointTest extends IntegrationTest {

    @Test
    @DisplayName("/actuator/health công khai, báo UP và không lộ chi tiết thành phần")
    void healthIsPublicAndTerse() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    @DisplayName("Các endpoint actuator khác không được mở")
    void otherActuatorEndpointsAreClosed() throws Exception {
        mvc.perform(get("/actuator/env")).andExpect(status().is4xxClientError());
        mvc.perform(get("/actuator/beans")).andExpect(status().is4xxClientError());
    }
}
