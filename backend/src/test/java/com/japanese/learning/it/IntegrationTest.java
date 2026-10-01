// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.it;
//
// import com.fasterxml.jackson.databind.JsonNode;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import org.junit.jupiter.api.BeforeAll;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
// import org.springframework.boot.test.context.SpringBootTest;
// import org.springframework.http.MediaType;
// import org.springframework.jdbc.core.JdbcTemplate;
// import org.springframework.test.context.DynamicPropertyRegistry;
// import org.springframework.test.context.DynamicPropertySource;
// import org.springframework.test.web.servlet.MockMvc;
// import org.springframework.test.web.servlet.ResultActions;
// import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
// import org.testcontainers.DockerClientFactory;
// import org.testcontainers.containers.PostgreSQLContainer;
//
// import java.util.Map;
// import java.util.concurrent.atomic.AtomicInteger;
//
// import static org.junit.jupiter.api.Assumptions.assumeTrue;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
//
// /**
//  * Nền cho integration test: cả ứng dụng chạy trên PostgreSQL 16 thật (Flyway áp V1–V3,
//  * {@code KanaSeeder} nạp kana), gọi qua MockMvc đúng như client thật.
//  *
//  * <p>Container là singleton, khởi động một lần cho cả JVM (không dùng {@code @Container}: extension đó
//  * dừng container sau mỗi lớp test trong khi Spring context được cache vẫn trỏ vào cổng cũ).
//  * Mọi lớp con dùng chung một CSDL và một context, nên mỗi test tự tạo người dùng riêng bằng
//  * {@link #register()} thay vì dọn bảng.
//  *
//  * <p>Không có Docker thì các test này bị bỏ qua (không fail) để {@code mvn test} vẫn chạy được
//  * trên máy chỉ có JDK; CI luôn có Docker nên luôn chạy.
//  */
// @SpringBootTest(properties = {
//         // Mọi request test đến từ cùng một IP; hạn mức thật (10/phút) sẽ chặn các test đăng ký.
//         "app.rate-limit.auth-requests-per-minute=10000"
// })
// @AutoConfigureMockMvc
// public abstract class IntegrationTest {
//
//     private static final boolean DOCKER = DockerClientFactory.instance().isDockerAvailable();
//
//     static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
//
//     static {
//         if (DOCKER) {
//             POSTGRES.start();
//         }
//     }
//
//     /** Chạy trước khi Spring nạp context, nên máy không có Docker bỏ qua sạch sẽ thay vì báo lỗi. */
//     @BeforeAll
//     static void requireDocker() {
//         assumeTrue(DOCKER, "Không có Docker — bỏ qua integration test");
//     }
//
//     /**
//      * Không dùng {@code @ServiceConnection}: nó đọc tên image ngay lúc Spring dựng cấu hình test —
//      * trước {@link #requireDocker()} — và việc đó đã cần Docker. Nguồn thuộc tính động chỉ được gọi
//      * khi context thật sự được nạp.
//      */
//     @DynamicPropertySource
//     static void datasource(DynamicPropertyRegistry registry) {
//         registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
//         registry.add("spring.datasource.username", POSTGRES::getUsername);
//         registry.add("spring.datasource.password", POSTGRES::getPassword);
//     }
//
//     private static final AtomicInteger USER_SEQ = new AtomicInteger();
//
//     @Autowired
//     protected MockMvc mvc;
//
//     @Autowired
//     protected ObjectMapper json;
//
//     @Autowired
//     protected JdbcTemplate jdbc;
//
//     /** Người dùng vừa đăng ký: id, access token và refresh token bản rõ. */
//     protected record TestUser(long id, String accessToken, String refreshToken) {
//         String bearer() {
//             return "Bearer " + accessToken;
//         }
//     }
//
//     protected TestUser register() throws Exception {
//         String name = "it" + System.nanoTime() % 1_000_000 + "_" + USER_SEQ.incrementAndGet();
//         JsonNode auth = body(mvc.perform(post("/api/v1/auth/register")
//                         .contentType(MediaType.APPLICATION_JSON)
//                         .content(json.writeValueAsString(Map.of(
//                                 "email", name + "@test.local",
//                                 "username", name,
//                                 "password", "matkhau123",
//                                 "displayName", "Học viên " + name))))
//                 .andExpect(status().isOk()));
//         return new TestUser(auth.at("/user/id").asLong(),
//                 auth.get("accessToken").asText(),
//                 auth.get("refreshToken").asText());
//     }
//
//     protected ResultActions getAs(TestUser user, String path) throws Exception {
//         return mvc.perform(authed(get(path), user));
//     }
//
//     protected ResultActions postAs(TestUser user, String path, Object body) throws Exception {
//         MockHttpServletRequestBuilder request = authed(post(path), user);
//         if (body != null) {
//             request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
//         }
//         return mvc.perform(request);
//     }
//
//     protected JsonNode body(ResultActions result) throws Exception {
//         return json.readTree(result.andReturn().getResponse().getContentAsString());
//     }
//
//     protected long count(String sql, Object... args) {
//         Long value = jdbc.queryForObject(sql, Long.class, args);
//         return value == null ? 0 : value;
//     }
//
//     private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder request, TestUser user) {
//         return user == null ? request : request.header("Authorization", user.bearer());
//     }
// }
