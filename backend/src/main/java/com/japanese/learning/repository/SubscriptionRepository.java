// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.Subscription;
// import com.japanese.learning.domain.enums.SubscriptionStatus;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.stereotype.Repository;
//
// import java.util.List;
// import java.util.Optional;
//
// @Repository
// public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
//
//     Optional<Subscription> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, SubscriptionStatus status);
//
//     List<Subscription> findByUserIdOrderByIdDesc(Long userId);
// }
