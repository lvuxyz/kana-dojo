package com.japanese.learning.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Chuyển mọi ngoại lệ thành Problem Details (RFC 7807) với thông báo tiếng Việt.
 * Không bao giờ để chi tiết kỹ thuật (SQL, stack trace) lọt ra ngoài.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handleApiException(ApiException ex, HttpServletRequest request) {
        ProblemDetail problem = build(ex.getStatus(), ex.getType(), ex.getTitle(), ex.getMessage(), request);
        if (!ex.getErrors().isEmpty()) {
            problem.setProperty("errors", ex.getErrors());
        }
        if (ex instanceof QuotaExceededException quota) {
            problem.setProperty("featureKey", quota.getFeatureKey());
            problem.setProperty("limitValue", quota.getLimitValue());
        }
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleBeanValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> errors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));

        ProblemDetail problem = build(HttpStatus.BAD_REQUEST, ErrorTypes.VALIDATION, "Dữ liệu không hợp lệ",
                errors.isEmpty() ? "Dữ liệu gửi lên không hợp lệ" : errors.values().iterator().next(), request);
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            errors.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage());
        }
        ProblemDetail problem = build(HttpStatus.BAD_REQUEST, ErrorTypes.VALIDATION, "Dữ liệu không hợp lệ",
                errors.isEmpty() ? "Tham số không hợp lệ" : errors.values().iterator().next(), request);
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler({HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ProblemDetail handleMalformedRequest(Exception ex, HttpServletRequest request) {
        log.debug("Yêu cầu không đọc được: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ErrorTypes.VALIDATION, "Dữ liệu không hợp lệ",
                "Nội dung yêu cầu không đúng định dạng mong đợi", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Vi phạm ràng buộc dữ liệu tại {}", request.getRequestURI(), ex);
        return build(HttpStatus.CONFLICT, ErrorTypes.CONFLICT, "Xung đột dữ liệu",
                "Dữ liệu đã tồn tại hoặc vi phạm ràng buộc", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED, "Chưa xác thực",
                "Thông tin đăng nhập không đúng", request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED, "Chưa xác thực",
                "Bạn cần đăng nhập để thực hiện thao tác này", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, ErrorTypes.FORBIDDEN, "Không có quyền truy cập",
                "Tài khoản của bạn không được phép thực hiện thao tác này", request);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ProblemDetail handleNoHandler(NoHandlerFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ErrorTypes.NOT_FOUND, "Không tìm thấy",
                "Đường dẫn không tồn tại", request);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Lỗi không lường trước tại {}", request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL, "Lỗi hệ thống",
                "Đã có lỗi xảy ra, vui lòng thử lại sau", request);
    }

    private ProblemDetail build(HttpStatus status, URI type, String title, String detail, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(type);
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }
}
