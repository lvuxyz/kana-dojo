# syntax=docker/dockerfile:1

# ---- Dependencies (theo đúng lockfile) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- Build: `next build` xuất bản tĩnh vào out/ ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# URL công khai được nhúng LÚC BUILD (canonical, sitemap, Open Graph). Đổi nó phải build lại image.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime: chỉ Nginx phục vụ tệp tĩnh, không có Node, không chạy bằng root ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
    CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
