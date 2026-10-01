#!/usr/bin/env bash
# Kiểm tra nhanh một bản triển khai đang chạy: mọi trang chính dựng được, 404 đúng chỗ, và đúng là site tĩnh
# (không còn API/đăng nhập). Hai kiểm tra header ở cuối nhắm vào web/nginx.conf của repo này.
#
#   scripts/smoke-test.sh [BASE_URL]      # mặc định http://localhost:3000
#
# Chỉ cần bash và curl.
#
# Lưu ý khi sửa: dưới `set -o pipefail`, KHÔNG dùng `... | grep -q` (hay `| head -1`) trên nội dung lớn. `grep -q` thoát ngay khi
# khớp, người ghi vào pipe nhận SIGPIPE (exit 141) và cả pipeline bị coi là lỗi — trang chủ ~94 KB vượt bộ đệm pipe nên
# chạy trên Linux là hỏng dù nội dung đúng. Vì vậy nội dung được đọc vào biến và so khớp bằng [[ ]] / =~, không qua pipe.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
# -g: tắt globbing của curl, nếu không `[id]` / `%5B` trong URL bị coi là dải ký tự
status() { curl -gs -o /dev/null -w '%{http_code}' "$BASE$1"; }

echo "Smoke test: $BASE"

# Trang nào cũng phải trả 200 và có nội dung thật trong HTML (không phải khung rỗng chờ JavaScript)
check_page() {
  local path="$1" needle="$2" body code
  body=$(curl -s -w '\n%{http_code}' "$BASE$path")
  code="${body##*$'\n'}"
  [ "$code" = 200 ] || fail "$path trả $code"
  [[ "$body" == *"$needle"* ]] || fail "$path thiếu nội dung \"$needle\""
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
[[ "$body" == *"Sitemap:"* ]] && pass "robots.txt có Sitemap" || fail "robots.txt thiếu Sitemap"
body=$(curl -sf "$BASE/sitemap.xml") || fail "Không đọc được /sitemap.xml"
[[ "$body" == *"<urlset"* ]] && pass "sitemap.xml hợp lệ" || fail "sitemap.xml không hợp lệ"

# --- PWA: manifest, icon và service worker ---
body=$(curl -sf "$BASE/manifest.webmanifest") || fail "Không đọc được /manifest.webmanifest"
[[ "$body" == *'"start_url"'* && "$body" == *'icon-512.png'* && "$body" == *'maskable'* ]] && pass "manifest.webmanifest hợp lệ" || fail "manifest.webmanifest thiếu start_url/icon"
for icon in /icons/icon-192.png /icons/icon-512.png /icons/icon-maskable-512.png /apple-icon.png; do
  [ "$(status "$icon")" = 200 ] && pass "$icon 200" || fail "$icon không tải được"
done
sw=$(curl -sf "$BASE/sw.js") || fail "Không đọc được /sw.js"
[[ "$sw" == *"const PRECACHE"* && "$sw" != *"__VERSION__"* && "$sw" != *"__PRECACHE__"* ]] || fail "sw.js chưa được sinh đúng (còn chỗ trống của mẫu?)"
# Service worker cài bằng cache.addAll: chỉ cần MỘT URL trong danh sách không trả 200 là cả lần cài đặt hỏng và app mất offline.
precached=0
while IFS= read -r line; do
  url="${line#*\"}"; url="${url%%\"*}"
  [ "$(status "$url")" = 200 ] || fail "Tệp trong precache của sw.js không trả 200: $url"
  precached=$((precached + 1))
done <<<"$(grep -E '^  "/' <<<"$sw")"
[ "$precached" -ge 40 ] && pass "sw.js precache $precached tệp, tất cả trả 200" || fail "Precache chỉ có $precached tệp"

# 404 phải là 404 thật (không phải 200 với trang rỗng), kèm trang 404 của site
[ "$(status /khong-ton-tai)" = 404 ] && pass "Đường dẫn lạ trả 404" || fail "Đường dẫn lạ không trả 404"
body=$(curl -s "$BASE/khong-ton-tai")
[[ "$body" == *"Không tìm thấy"* ]] && pass "Trang 404 của site được dùng" || fail "Thiếu trang 404 tuỳ biến"
[ "$(status /quiz/999)" = 404 ] && pass "Quiz không tồn tại trả 404" || fail "/quiz/999 không trả 404"

# Site công khai, không tài khoản, không API: những đường dẫn của bản cũ phải biến mất
for gone in /dang-nhap /dang-ky /bang-xep-hang /api/v1/kana /api/auth/login; do
  [ "$(status "$gone")" = 404 ] && pass "$gone đã gỡ (404)" || fail "$gone vẫn còn phục vụ"
done

# --- Nhắm vào web/nginx.conf ---
# Header chỉ vài trăm byte nên here-string an toàn; HTML thì phải so khớp trong bash (xem ghi chú đầu tệp).
headers=$(curl -sI "$BASE/")
grep -qi '^x-content-type-options: nosniff' <<<"$headers" && pass "Có header X-Content-Type-Options" || fail "Thiếu X-Content-Type-Options"
html=$(curl -s "$BASE/")
[[ "$html" =~ (/_next/static/[^\"]+\.js) ]] || fail "Không tìm thấy tệp JS trong trang chủ"
asset="${BASH_REMATCH[1]}"
headers=$(curl -sI "$BASE$asset")
grep -qi '^cache-control: max-age=31536000' <<<"$headers" && pass "Tệp tĩnh có mã băm được cache 1 năm" || fail "$asset không được cache dài hạn"

headers=$(curl -sI "$BASE/sw.js")
grep -qi '^cache-control: no-cache' <<<"$headers" && pass "sw.js không bị cache lâu" || fail "sw.js phải là Cache-Control: no-cache để bản deploy mới cập nhật được cache offline"
headers=$(curl -sI "$BASE/manifest.webmanifest")
grep -qi '^content-type: application/manifest+json' <<<"$headers" && pass "manifest đúng Content-Type" || fail "manifest.webmanifest sai Content-Type"

echo "Tất cả đều ổn."
