// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.config;
//
// import org.springframework.context.annotation.Configuration;
// import org.springframework.core.convert.converter.Converter;
// import org.springframework.core.convert.converter.ConverterFactory;
// import org.springframework.format.FormatterRegistry;
// import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
//
// /**
//  * Chấp nhận tham số enum không phân biệt hoa thường ({@code ?script=hiragana} cũng như
//  * {@code ?script=HIRAGANA}) và coi chuỗi rỗng là "không lọc", để client không phải
//  * bỏ hẳn tham số khỏi URL khi người dùng chọn "tất cả".
//  */
// @Configuration
// public class WebConfig implements WebMvcConfigurer {
//
//     @Override
//     public void addFormatters(FormatterRegistry registry) {
//         registry.addConverterFactory(new CaseInsensitiveEnumConverterFactory());
//     }
//
//     @SuppressWarnings("rawtypes")
//     static class CaseInsensitiveEnumConverterFactory implements ConverterFactory<String, Enum> {
//
//         @Override
//         public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
//             return new StringToEnum<>(targetType);
//         }
//     }
//
//     @SuppressWarnings("rawtypes")
//     private static class StringToEnum<T extends Enum> implements Converter<String, T> {
//
//         private final Class<T> enumType;
//
//         StringToEnum(Class<T> enumType) {
//             this.enumType = enumType;
//         }
//
//         @Override
//         @SuppressWarnings("unchecked")
//         public T convert(String source) {
//             String trimmed = source.trim();
//             if (trimmed.isEmpty()) {
//                 return null;
//             }
//             return (T) Enum.valueOf(this.enumType, trimmed.toUpperCase());
//         }
//     }
// }
