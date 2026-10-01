# ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
# Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `# `.
# Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `# ` ở mọi dòng còn lại.
# [máy chủ — đang tắt]
# # syntax=docker/dockerfile:1
#
# # ---- Build: Maven + JDK 17 (image temurin thuần không có Maven) ----
# FROM maven:3.9-eclipse-temurin-17 AS build
# WORKDIR /app
# COPY pom.xml .
# RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
# COPY src ./src
# # Test chạy ở CI (integration test cần Docker, không chạy được trong lúc build image).
# RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests \
#     && cp target/kana-dojo-backend-*.jar app.jar
#
# # ---- Runtime: chỉ JRE, người dùng không phải root ----
# FROM eclipse-temurin:17-jre-alpine
# RUN addgroup -S app && adduser -S app -G app
# WORKDIR /app
# COPY --from=build /app/app.jar app.jar
# USER app
#
# ENV SPRING_PROFILES_ACTIVE=prod \
#     JAVA_OPTS="-XX:MaxRAMPercentage=75"
# EXPOSE 8080
#
# # wget có sẵn trong busybox của Alpine. Khởi động lần đầu chạy Flyway + nạp kana nên start-period dài.
# HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
#     CMD wget -qO- http://127.0.0.1:${SERVER_PORT:-8080}/actuator/health | grep -q '"UP"' || exit 1
#
# ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
