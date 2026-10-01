// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.config;
//
// import io.swagger.v3.oas.models.Components;
// import io.swagger.v3.oas.models.OpenAPI;
// import io.swagger.v3.oas.models.info.Info;
// import io.swagger.v3.oas.models.security.SecurityRequirement;
// import io.swagger.v3.oas.models.security.SecurityScheme;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
//
// @Configuration
// public class OpenApiConfig {
//
//     private static final String BEARER = "bearerAuth";
//
//     @Bean
//     public OpenAPI kanaDojoOpenApi() {
//         return new OpenAPI()
//                 .info(new Info()
//                         .title("Kana Dōjō API")
//                         .version("v1")
//                         .description("API học tiếng Nhật: bảng chữ kana, luyện viết nét, SRS theo FSRS-6, trò chơi hóa."))
//                 .components(new Components().addSecuritySchemes(BEARER,
//                         new SecurityScheme()
//                                 .type(SecurityScheme.Type.HTTP)
//                                 .scheme("bearer")
//                                 .bearerFormat("JWT")))
//                 .addSecurityItem(new SecurityRequirement().addList(BEARER));
//     }
// }
