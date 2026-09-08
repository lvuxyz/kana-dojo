package com.japanese.learning.common;

import java.net.URI;

/** Định danh loại lỗi theo RFC 7807; client dựa vào giá trị này chứ không phải vào chuỗi mô tả. */
public final class ErrorTypes {

    private static final String BASE = "https://kanadojo.app/errors/";

    public static final URI VALIDATION = URI.create(BASE + "validation");
    public static final URI NOT_FOUND = URI.create(BASE + "not-found");
    public static final URI UNAUTHORIZED = URI.create(BASE + "unauthorized");
    public static final URI FORBIDDEN = URI.create(BASE + "forbidden");
    public static final URI CONFLICT = URI.create(BASE + "conflict");
    public static final URI QUOTA_EXCEEDED = URI.create(BASE + "quota-exceeded");
    public static final URI RATE_LIMITED = URI.create(BASE + "rate-limited");
    public static final URI INTERNAL = URI.create(BASE + "internal");

    private ErrorTypes() {
    }
}
