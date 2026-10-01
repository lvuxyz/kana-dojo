# syntax=docker/dockerfile:1

# ---- Dependencies (theo đúng lockfile) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# CHẾ ĐỘ CÁ NHÂN (docs/LOCAL_MODE.md): chỉ còn NEXT_PUBLIC_SITE_URL, được nhúng LÚC BUILD vào bundle trình duyệt;
# đổi nó phải build lại image.
# [máy chủ — đang tắt] Ba giá trị này được nhúng LÚC BUILD: NEXT_PUBLIC_* vào bundle trình duyệt, BACKEND_URL vào
# [máy chủ — đang tắt] đích rewrite /api/v1/*. Đổi chúng phải build lại image, không đổi được bằng biến môi trường lúc chạy.
# [máy chủ — đang tắt] ARG BACKEND_URL=http://backend:8080
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
# [máy chủ — đang tắt] ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
# [máy chủ — đang tắt] ENV BACKEND_URL=$BACKEND_URL \
# [máy chủ — đang tắt]     NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
# [máy chủ — đang tắt]     NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
# [máy chủ — đang tắt]     NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime: server standalone, người dùng không phải root ----
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public
USER nextjs

# [máy chủ — đang tắt] Route handler /api/auth/* đọc BACKEND_URL lúc chạy; mặc định trùng giá trị đã build.
# [máy chủ — đang tắt] ARG BACKEND_URL=http://backend:8080
# [máy chủ — đang tắt] ENV NODE_ENV=production \
# [máy chủ — đang tắt]     NEXT_TELEMETRY_DISABLED=1 \
# [máy chủ — đang tắt]     BACKEND_URL=$BACKEND_URL \
# [máy chủ — đang tắt]     HOSTNAME=0.0.0.0 \
# [máy chủ — đang tắt]     PORT=3000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -qO /dev/null http://127.0.0.1:3000/dang-nhap || exit 1

CMD ["node", "server.js"]
