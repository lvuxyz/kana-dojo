#!/usr/bin/env bash
# Kiểm tra nhanh một bản triển khai đang chạy.
#
#   scripts/smoke-test.sh [BASE_URL]                    # mặc định http://localhost:3000, chế độ local
#   SMOKE_MODE=server scripts/smoke-test.sh [BASE_URL]  # bản có máy chủ (backend + PostgreSQL)
#
# SMOKE_MODE=local  (mặc định) — web ở chế độ cá nhân (docs/LOCAL_MODE.md): không có backend, không có tài khoản.
#                   Kiểm tra web tự đứng được: trang chủ, bảng chữ cái dựng tĩnh, SEO, lối vào ứng dụng, các trang
#                   đăng nhập/đăng ký chuyển thẳng vào ứng dụng, và KHÔNG còn đường nào đi tới backend.
# SMOKE_MODE=server — đi đúng đường của trình duyệt: trang web → rewrite /api/v1 → BFF /api/auth (cookie) →
#                   request ghi có header Origin (CORS). Dùng sau khi bật lại máy chủ (xem docs/LOCAL_MODE.md §5).
#
# Chỉ cần bash, curl và node. Chế độ server tạo một tài khoản thử mới mỗi lần chạy.
set -euo pipefail

MODE="${SMOKE_MODE:-local}"
BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
# json <biểu thức JS trên biến d> — đọc JSON từ stdin
json() { node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s);const v=('"$1"');process.stdout.write(String(v))})'; }
# status <đường dẫn> [tham số curl…] — in mã HTTP, không theo redirect
status() { local path="$1"; shift; curl -s -o /dev/null -w '%{http_code}' "$@" "$BASE$path"; }

echo "Smoke test ($MODE): $BASE"

# Container vừa lên có thể chưa nhận kết nối; chờ tối đa 30 giây thay vì báo lỗi oan.
for _ in $(seq 1 30); do
  [ "$(status /)" = 200 ] && break
  sleep 1
done

# ---------------------------------------------------------------------------------------------------------------
# Chế độ cá nhân: web không gọi backend.
# ---------------------------------------------------------------------------------------------------------------
smoke_local() {
  code=$(status /)
  [ "$code" = 200 ] && pass "Trang chủ 200" || fail "Trang chủ trả $code"

  # Hai bảng chữ cái được dựng tĩnh lúc build (SEO): phải có chữ thật trong HTML, không phải khung rỗng chờ JavaScript.
  curl -sf "$BASE/bang-chu-cai/hiragana" | grep -q 'あ' && pass "Bảng Hiragana dựng tĩnh, có chữ あ trong HTML" \
    || fail "/bang-chu-cai/hiragana không trả HTML chứa あ"
  curl -sf "$BASE/bang-chu-cai/katakana" | grep -q 'ア' && pass "Bảng Katakana dựng tĩnh, có chữ ア trong HTML" \
    || fail "/bang-chu-cai/katakana không trả HTML chứa ア"

  code=$(status /robots.txt)
  [ "$code" = 200 ] && pass "robots.txt 200" || fail "robots.txt trả $code"
  sitemap=$(curl -sf "$BASE/sitemap.xml") || fail "sitemap.xml không đọc được"
  grep -q '/bang-chu-cai/hiragana' <<<"$sitemap" && pass "sitemap.xml 200, có trang Hiragana" \
    || fail "sitemap.xml thiếu /bang-chu-cai/hiragana"
  # /dang-ky chỉ còn chuyển hướng vào ứng dụng nên không được nằm trong sitemap.
  grep -q '/dang-ky' <<<"$sitemap" && fail "sitemap.xml còn liệt kê /dang-ky (trang này chuyển hướng)" \
    || pass "sitemap.xml không liệt kê /dang-ky"

  # Khung ứng dụng là trang tĩnh; dữ liệu học nằm trong trình duyệt nên không cần đăng nhập để mở.
  code=$(status /bang-dieu-khien)
  [ "$code" = 200 ] && pass "/bang-dieu-khien mở được không cần đăng nhập (200)" || fail "/bang-dieu-khien trả $code"

  # Không có tài khoản: link cũ tới trang đăng nhập/đăng ký phải đưa thẳng vào ứng dụng.
  for page in /dang-nhap /dang-ky; do
    out=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$page" | tr -d '\r')
    code=${out%% *}; loc=${out#* }
    { [ "$code" = 307 ] || [ "$code" = 308 ]; } && [[ "$loc" == */bang-dieu-khien ]] \
      && pass "$page → $code về /bang-dieu-khien" || fail "$page trả $code ($loc), mong đợi chuyển về /bang-dieu-khien"
  done

  # Không còn đường nào tới backend: rewrite /api/v1 và BFF /api/auth đã tắt. Nếu bước này đỏ, có thể ai đó bật lại
  # một nửa — chạy SMOKE_MODE=server hoặc xem docs/LOCAL_MODE.md.
  code=$(status "/api/v1/kana?script=HIRAGANA")
  [ "$code" = 404 ] && pass "/api/v1/* không được chuyển tới backend (404)" \
    || fail "/api/v1/kana trả $code — rewrite tới backend còn bật?"
  code=$(status /api/auth/login -X POST -H 'Content-Type: application/json' -d '{}')
  { [ "$code" = 404 ] || [ "$code" = 405 ]; } && pass "BFF /api/auth/login đã tắt ($code)" \
    || fail "POST /api/auth/login trả $code — route BFF còn bật?"
}

# ---------------------------------------------------------------------------------------------------------------
# Bản có máy chủ: trang web → rewrite → BFF (cookie) → CORS.
# ---------------------------------------------------------------------------------------------------------------
smoke_server() {
  code=$(status /)
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
  code=$(status "/api/v1/quizzes/$quizzes/attempts" -X POST -H "Origin: $BASE" -H "Authorization: Bearer $token")
  [ "$code" = 200 ] && pass "POST có Origin qua rewrite: 200 (CORS_ORIGINS đúng)" \
    || fail "POST có Origin trả $code — kiểm tra CORS_ORIGINS/SITE_URL"

  code=$(status /api/auth/refresh -b "$JAR" -X POST)
  [ "$code" = 200 ] && pass "Refresh bằng cookie: 200" || fail "Refresh trả $code"
}

case "$MODE" in
  local)  smoke_local ;;
  server) smoke_server ;;
  *) fail "SMOKE_MODE phải là local hoặc server (nhận được: $MODE)" ;;
esac

echo "Tất cả đều ổn."
