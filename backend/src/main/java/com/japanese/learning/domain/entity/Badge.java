// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.BadgeTier;
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
// import org.hibernate.annotations.JdbcTypeCode;
// import org.hibernate.type.SqlTypes;
//
// import java.util.LinkedHashMap;
// import java.util.Map;
//
// @Entity
// @Table(name = "badges")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class Badge extends BaseEntity {
//
//     @Column(name = "code", nullable = false, unique = true, length = 48)
//     private String code;
//
//     @Column(name = "name_vi", nullable = false, length = 128)
//     private String nameVi;
//
//     @Column(name = "description_vi", nullable = false)
//     private String descriptionVi;
//
//     @Column(name = "icon", length = 16)
//     private String icon;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "tier", nullable = false, length = 12)
//     private BadgeTier tier;
//
//     /** Điều kiện dạng dữ liệu để client hiển thị tiến độ mà không cần hardcode logic. */
//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "criteria", columnDefinition = "jsonb")
//     @Builder.Default
//     private Map<String, Object> criteria = new LinkedHashMap<>();
//
//     @Column(name = "sort_order", nullable = false)
//     @Builder.Default
//     private int sortOrder = 0;
// }
