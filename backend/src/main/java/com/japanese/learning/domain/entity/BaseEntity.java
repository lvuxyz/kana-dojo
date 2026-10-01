// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import jakarta.persistence.Column;
// import jakarta.persistence.GeneratedValue;
// import jakarta.persistence.GenerationType;
// import jakarta.persistence.Id;
// import jakarta.persistence.MappedSuperclass;
// import jakarta.persistence.PrePersist;
// import jakarta.persistence.PreUpdate;
// import lombok.Getter;
// import lombok.Setter;
//
// import java.time.Instant;
// import java.util.Objects;
//
// /** Khoá chính và dấu thời gian dùng chung cho mọi bảng nghiệp vụ. */
// @MappedSuperclass
// @Getter
// @Setter
// public abstract class BaseEntity {
//
//     @Id
//     @GeneratedValue(strategy = GenerationType.IDENTITY)
//     @Column(name = "id", nullable = false, updatable = false)
//     private Long id;
//
//     @Column(name = "created_at", nullable = false, updatable = false)
//     private Instant createdAt;
//
//     @Column(name = "updated_at")
//     private Instant updatedAt;
//
//     @PrePersist
//     void onInsert() {
//         if (createdAt == null) {
//             createdAt = Instant.now();
//         }
//     }
//
//     @PreUpdate
//     void onUpdate() {
//         updatedAt = Instant.now();
//     }
//
//     @Override
//     public boolean equals(Object other) {
//         if (this == other) {
//             return true;
//         }
//         if (other == null || !getClass().equals(other.getClass())) {
//             return false;
//         }
//         Long otherId = ((BaseEntity) other).getId();
//         return id != null && id.equals(otherId);
//     }
//
//     @Override
//     public int hashCode() {
//         return Objects.hash(getClass().getName());
//     }
// }
