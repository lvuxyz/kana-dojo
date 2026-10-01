// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.service;
//
// import com.japanese.learning.common.ApiException;
// import com.japanese.learning.domain.entity.User;
// import com.japanese.learning.domain.enums.UserStatus;
// import com.japanese.learning.repository.UserRepository;
// import com.japanese.learning.security.AppUserPrincipal;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
//
// /**
//  * Nạp người dùng hiện tại từ danh tính trong SecurityContext.
//  * Đây là điểm duy nhất hợp lệ để biết "ai đang gọi" — không endpoint nào được nhận userId từ client.
//  */
// @Service
// @RequiredArgsConstructor
// public class CurrentUserService {
//
//     private final UserRepository userRepository;
//
//     @Transactional(readOnly = true)
//     public User require(AppUserPrincipal principal) {
//         if (principal == null) {
//             throw ApiException.unauthorized("Bạn cần đăng nhập để thực hiện thao tác này");
//         }
//         User user = userRepository.findById(principal.id())
//                 .orElseThrow(() -> ApiException.unauthorized("Phiên đăng nhập không còn hợp lệ"));
//         if (user.getStatus() != UserStatus.ACTIVE) {
//             throw ApiException.forbidden("Tài khoản đã bị khoá hoặc ngừng hoạt động");
//         }
//         return user;
//     }
// }
