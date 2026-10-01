#!/usr/bin/env bash
# Kiểm tra nhanh một bản triển khai đang chạy: mọi trang chính dựng được, 404 đúng chỗ, và đúng là site tĩnh
# (không còn API/đăng nhập). Hai kiểm tra header ở cuối nhắm vào web/nginx.conf của repo này.
#
#   scripts/smoke-test.sh [BASE_URL]      # mặc định http://localhost:3000
#
# Chỉ cần bash và curl.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }

echo "Smoke test: $BASE"

# Trang nào cũng phải trả 200 và có nội dung thật trong HTML (không phải khung rỗng chờ JavaScript)
check_page() {
  local path="$1" needle="$2" body code
  body=$(curl -s -w '\n%{http_code}' "$BASE$path")
  code="${body##*$'\n'}"
  [ "$code" = 200 ] || fail "$path trả $code"
  printf '%s' "$body" | grep -q "$needle" || fail "$path thiếu nội dung \"$needle\""
  pass "$path 200"
}

check_page /                      "Kana Dōjō"
check_page /bang-chu-cai/hiragana "ひらがな"
check_page /bang-chu-cai/katakana "カタカナ"
check_page /luyen-viet            "Luyện viết"
check_page /tu-vung               "Từ vựng"
check_page /quiz                  "Quiz"
check_page /quiz/1                "Hiragana cơ bản"
check_page /on-tap                "Ôn tập"
check_page /bang-dieu-khien       "Tổng quan"
check_page /cai-dat               "Cài đặt"

body=$(curl -sf "$BASE/robots.txt") || fail "Không đọc được /robots.txt"
printf '%s' "$body" | grep -q 'Sitemap:' && pass "robots.txt có Sitemap" || fail "robots.txt thiếu Sitemap"
curl -sf "$BASE/sitemap.xml" | grep -q '<urlset' && pass "sitemap.xml hợp lệ" || fail "sitemap.xml không hợp lệ"

# 404 phải là 404 thật (không phải 200 với trang rỗng), kèm trang 404 của site
[ "$(status /khong-ton-tai)" = 404 ] && pass "Đường dẫn lạ trả 404" || fail "Đường dẫn lạ không trả 404"
curl -s "$BASE/khong-ton-tai" | grep -q "Không tìm thấy" && pass "Trang 404 của site được dùng" || fail "Thiếu trang 404 tuỳ biến"
[ "$(status /quiz/999)" = 404 ] && pass "Quiz không tồn tại trả 404" || fail "/quiz/999 không trả 404"

# Site công khai, không tài khoản, không API: những đường dẫn của bản cũ phải biến mất
for gone in /dang-nhap /dang-ky /bang-xep-hang /api/v1/kana /api/auth/login; do
  [ "$(status "$gone")" = 404 ] && pass "$gone đã gỡ (404)" || fail "$gone vẫn còn phục vụ"
done

# --- Nhắm vào web/nginx.conf ---
headers=$(curl -sI "$BASE/")
printf '%s' "$headers" | grep -qi '^x-content-type-options: nosniff' && pass "Có header X-Content-Type-Options" || fail "Thiếu X-Content-Type-Options"
asset=$(curl -s "$BASE/" | grep -o '/_next/static/[^"]*\.js' | head -1)
[ -n "$asset" ] || fail "Không tìm thấy tệp JS trong trang chủ"
curl -sI "$BASE$asset" | grep -qi '^cache-control: max-age=31536000' && pass "Tệp tĩnh có mã băm được cache 1 năm" || fail "$asset không được cache dài hạn"

echo "Tất cả đều ổn."
