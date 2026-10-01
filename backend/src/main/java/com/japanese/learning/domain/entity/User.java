// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.PlanCode;
// import com.japanese.learning.domain.enums.Role;
// import com.japanese.learning.domain.enums.UserStatus;
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.EnumType;
// import jakarta.persistence.Enumerated;
// import jakarta.persistence.Table;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// import java.time.Instant;
// import java.time.ZoneId;
//
// @Entity
// @Table(name = "users")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class User extends BaseEntity {
//
//     @Column(name = "email", nullable = false, unique = true, columnDefinition = "citext")
//     private String email;
//
//     @Column(name = "username", nullable = false, unique = true, length = 32)
//     private String username;
//
//     /** NULL với tài khoản chỉ đăng nhập bằng Google. */
//     @Column(name = "password_hash", length = 100)
//     private String passwordHash;
//
//     @Column(name = "display_name", nullable = false, length = 64)
//     private String displayName;
//
//     @Column(name = "avatar_url")
//     private String avatarUrl;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "role", nullable = false, length = 16)
//     @Builder.Default
//     private Role role = Role.USER;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "plan", nullable = false, length = 16)
//     @Builder.Default
//     private PlanCode plan = PlanCode.FREE;
//
//     /** Múi giờ IANA; streak và mục tiêu ngày đều tính theo múi giờ này chứ không theo UTC. */
//     @Column(name = "timezone", nullable = false, length = 64)
//     @Builder.Default
//     private String timezone = "Asia/Ho_Chi_Minh";
//
//     @Column(name = "locale", nullable = false, length = 8)
//     @Builder.Default
//     private String locale = "vi";
//
//     @Column(name = "daily_goal_xp", nullable = false)
//     @Builder.Default
//     private Integer dailyGoalXp = 50;
//
//     @Column(name = "email_verified", nullable = false)
//     @Builder.Default
//     private boolean emailVerified = false;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "status", nullable = false, length = 16)
//     @Builder.Default
//     private UserStatus status = UserStatus.ACTIVE;
//
//     @Column(name = "last_login_at")
//     private Instant lastLoginAt;
//
//     /** Múi giờ đã phân giải, rơi về giờ Việt Nam nếu dữ liệu cũ chứa chuỗi không hợp lệ. */
//     public ZoneId zoneId() {
//         try {
//             return ZoneId.of(timezone);
//         } catch (RuntimeException ex) {
//             return ZoneId.of("Asia/Ho_Chi_Minh");
//         }
//     }
// }
