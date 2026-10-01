// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.User;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.util.Optional;
//
// @Repository
// public interface UserRepository extends JpaRepository<User, Long> {
//
//     /**
//      * Cột {@code email} là citext nên UNIQUE đã không phân biệt hoa thường ở tầng CSDL.
//      * Tuy vậy tham số JDBC được gửi kèm kiểu varchar, khiến phép so sánh trong WHERE lại
//      * rơi về varchar = varchar (phân biệt hoa thường). Vì thế mọi truy vấn theo email
//      * đều hạ chữ thường tường minh, không dựa vào citext.
//      */
//     @Query("select u from User u where lower(u.email) = lower(:email)")
//     Optional<User> findByEmail(@Param("email") String email);
//
//     Optional<User> findByUsername(String username);
//
//     @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
//     boolean existsByEmail(@Param("email") String email);
//
//     boolean existsByUsername(String username);
//
//     /** Cho phép đăng nhập bằng email hoặc username với cùng một trường nhập liệu. */
//     @Query("select u from User u where lower(u.email) = lower(:value) or lower(u.username) = lower(:value)")
//     Optional<User> findByEmailOrUsername(@Param("value") String value);
// }
