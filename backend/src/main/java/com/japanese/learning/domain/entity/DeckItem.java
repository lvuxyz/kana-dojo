// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.ItemType;
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.EnumType;
// import jakarta.persistence.Enumerated;
// import jakarta.persistence.Table;
// import jakarta.persistence.UniqueConstraint;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// @Entity
// @Table(name = "deck_items",
//         uniqueConstraints = @UniqueConstraint(name = "uq_deck_items",
//                 columnNames = {"deck_id", "item_type", "item_id"}))
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class DeckItem extends BaseEntity {
//
//     @Column(name = "deck_id", nullable = false)
//     private Long deckId;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "item_type", nullable = false, length = 24)
//     private ItemType itemType;
//
//     @Column(name = "item_id", nullable = false)
//     private Long itemId;
//
//     @Column(name = "position", nullable = false)
//     @Builder.Default
//     private Integer position = 0;
// }
