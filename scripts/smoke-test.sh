#!/usr/bin/env bash
# Kiểm tra nhanh một bản triển khai đang chạy, đi qua đúng đường của trình duyệt:
# trang web → rewrite /api/v1 → BFF /api/auth (cookie) → request ghi có header Origin (CORS).
#
#   scripts/smoke-test.sh [BASE_URL]      # mặc định http://localhost:3000
#
# Chỉ cần bash, curl và node. Tạo một tài khoản thử mới mỗi lần chạy.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
# json <biểu thức JS trên biến d> — đọc JSON từ stdin
json() { node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);const v=('"$1"');process.stdout.write(String(v))})'; }

echo "Smoke test: $BASE"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
[ "$code" = 200 ] && pass "Trang chủ 200" || fail "Trang chủ trả $code"

kana=$(curl -sf "$BASE/api/v1/kana?script=HIRAGANA" | json 'd.length') || fail "Không gọi được /api/v1/kana qua rewrite"
[ "$kana" -ge 46 ] && pass "Rewrite /api/v1 → backend ($kana ký tự hiragana)" || fail "Chỉ có $kana ký tự"

user="smoke$(date +%s)$RANDOM"
auth=$(curl -sf -c "$JAR" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$user@smoke.test\",\"username\":\"$user\",\"password\":\"smoketest123\",\"displayName\":\"Smoke\"}") \
  || fail "Đăng ký qua BFF /api/auth/register thất bại"
token=$(printf '%s' "$auth" | json 'd.accessToken')
has_rt=$(printf '%s' "$auth" | json '"refreshToken" in d')
[ -n "$token" ] && [ "$has_rt" = false ] && pass "BFF đăng ký: trả accessToken, giấu refreshToken" \
  || fail "Phản hồi BFF sai (refreshToken không được lộ ra JS)"
grep -q 'kd_rt' "$JAR" && pass "Cookie kd_rt đã được đặt" || fail "Không thấy cookie kd_rt"

quizzes=$(curl -sf -H "Authorization: Bearer $token" "$BASE/api/v1/quizzes" | json 'd.content[0].id') \
  || fail "Không đọc được danh sách quiz"
pass "Có quiz seed (id $quizzes)"

# Trình duyệt luôn gửi Origin với POST; rewrite chuyển tiếp nó → backend kiểm tra CORS.
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Origin: $BASE" -H "Authorization: Bearer $token" \
  "$BASE/api/v1/quizzes/$quizzes/attempts")
[ "$code" = 200 ] && pass "POST có Origin qua rewrite: 200 (CORS_ORIGINS đúng)" \
  || fail "POST có Origin trả $code — kiểm tra CORS_ORIGINS/SITE_URL"

code=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/auth/refresh")
[ "$code" = 200 ] && pass "Refresh bằng cookie: 200" || fail "Refresh trả $code"

echo "Tất cả đều ổn."
