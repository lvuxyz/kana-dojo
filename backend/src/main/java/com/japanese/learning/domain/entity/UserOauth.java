// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.Table;
// import jakarta.persistence.UniqueConstraint;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// @Entity
// @Table(name = "user_oauth",
//         uniqueConstraints = @UniqueConstraint(name = "uq_user_oauth_provider",
//                 columnNames = {"provider", "provider_user_id"}))
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class UserOauth extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Column(name = "provider", nullable = false, length = 16)
//     private String provider;
//
//     @Column(name = "provider_user_id", nullable = false, length = 128)
//     private String providerUserId;
//
//     @Column(name = "email", columnDefinition = "citext")
//     private String email;
// }
