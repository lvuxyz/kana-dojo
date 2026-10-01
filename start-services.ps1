<#
.SYNOPSIS
    Khởi động Kana Dōjō: Next.js Frontend (chế độ cá nhân — không cần PostgreSQL hay Spring Boot, xem docs/LOCAL_MODE.md).
    Các bước khởi động PostgreSQL và Spring Boot được giữ nguyên dưới dạng comment (đánh dấu [máy chủ — đang tắt]).
#>
param (
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          KANA DŌJŌ - KHỞI ĐỘNG (CHẾ ĐỘ CÁ NHÂN)          " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# [máy chủ — đang tắt] # 1. PostgreSQL
# [máy chủ — đang tắt] $pgPort = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
# [máy chủ — đang tắt] if ($pgPort) {
# [máy chủ — đang tắt]     Write-Host "[✓] PostgreSQL 16 đang hoạt động trên port 5432 (PID: $($pgPort[0].OwningProcess))" -ForegroundColor Green
# [máy chủ — đang tắt] } else {
# [máy chủ — đang tắt]     Write-Host "[i] Đang khởi động PostgreSQL 16..." -ForegroundColor Yellow
# [máy chủ — đang tắt]     $pgBin = Join-Path $Root ".tools\pgsql\bin\postgres.exe"
# [máy chủ — đang tắt]     $pgData = Join-Path $Root ".tools\pgsql\data"
# [máy chủ — đang tắt]     if (Test-Path $pgBin) {
# [máy chủ — đang tắt]         Start-Process -FilePath $pgBin -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden
# [máy chủ — đang tắt]         Start-Sleep -Seconds 2
# [máy chủ — đang tắt]         Write-Host "[✓] PostgreSQL 16 đã được khởi động!" -ForegroundColor Green
# [máy chủ — đang tắt]     } else {
# [máy chủ — đang tắt]         Write-Host "[!] Không tìm thấy thư mục PostgreSQL tại .tools\pgsql" -ForegroundColor Red
# [máy chủ — đang tắt]     }
# [máy chủ — đang tắt] }

# [máy chủ — đang tắt] # 2. Tìm Java 21+
# [máy chủ — đang tắt] $javaPath = "java"
# [máy chủ — đang tắt] $candidates = @(
# [máy chủ — đang tắt]     "C:\Program Files\JetBrains\PyCharm 2025.2.1.1\jbr\bin\java.exe",
# [máy chủ — đang tắt]     "C:\Program Files\Java\jdk-21\bin\java.exe",
# [máy chủ — đang tắt]     "C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe"
# [máy chủ — đang tắt] )
# [máy chủ — đang tắt] foreach ($c in $candidates) {
# [máy chủ — đang tắt]     if (Test-Path $c) {
# [máy chủ — đang tắt]         $javaPath = $c
# [máy chủ — đang tắt]         break
# [máy chủ — đang tắt]     }
# [máy chủ — đang tắt] }

# [máy chủ — đang tắt] # 3. Spring Boot Backend
# [máy chủ — đang tắt] $bePort = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
# [máy chủ — đang tắt] if ($bePort) {
# [máy chủ — đang tắt]     Write-Host "[✓] Backend Spring Boot đang chạy trên port 8080 (PID: $($bePort[0].OwningProcess))" -ForegroundColor Green
# [máy chủ — đang tắt] } else {
# [máy chủ — đang tắt]     Write-Host "[i] Đang khởi động Spring Boot Backend với: $javaPath" -ForegroundColor Yellow
# [máy chủ — đang tắt]     $jarPath = Join-Path $Root "backend\target\kana-dojo-backend-1.0.0.jar"
# [máy chủ — đang tắt]     if (Test-Path $jarPath) {
# [máy chủ — đang tắt]         Start-Process -FilePath $javaPath -ArgumentList "-jar `"$jarPath`"" -WindowStyle Hidden
# [máy chủ — đang tắt]         Write-Host "[i] Đang chờ Backend khởi động (khoảng 5-8 giây)..." -ForegroundColor Yellow
# [máy chủ — đang tắt]         $ready = $false
# [máy chủ — đang tắt]         for ($i = 0; $i -lt 15; $i++) {
# [máy chủ — đang tắt]             Start-Sleep -Seconds 1
# [máy chủ — đang tắt]             try {
# [máy chủ — đang tắt]                 $check = Invoke-RestMethod -Uri "http://localhost:8080/v3/api-docs" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
# [máy chủ — đang tắt]                 if ($check) { $ready = $true; break }
# [máy chủ — đang tắt]             } catch {}
# [máy chủ — đang tắt]         }
# [máy chủ — đang tắt]         if ($ready) {
# [máy chủ — đang tắt]             Write-Host "[✓] Backend Spring Boot đã sẵn sàng tại http://localhost:8080!" -ForegroundColor Green
# [máy chủ — đang tắt]         } else {
# [máy chủ — đang tắt]             Write-Host "[!] Backend đã khởi chạy trong nền, hãy kiểm tra http://localhost:8080" -ForegroundColor Yellow
# [máy chủ — đang tắt]         }
# [máy chủ — đang tắt]     } else {
# [máy chủ — đang tắt]         Write-Host "[!] Không tìm thấy JAR tại $jarPath. Hãy chạy 'mvn clean package -DskipTests' trước." -ForegroundColor Red
# [máy chủ — đang tắt]     }
# [máy chủ — đang tắt] }

# 4. Frontend Next.js
if (-not $SkipFrontend) {
    $fePort = Get-NetTCPConnection -LocalPort 3001, 3000 -State Listen -ErrorAction SilentlyContinue
    if ($fePort) {
        Write-Host "[✓] Frontend Next.js đang chạy trên port $($fePort[0].LocalPort) (PID: $($fePort[0].OwningProcess))" -ForegroundColor Green
    } else {
        Write-Host "[i] Đang khởi động Frontend Next.js trên port 3001..." -ForegroundColor Yellow
        $webDir = Join-Path $Root "web"
        Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- -p 3001" -WorkingDirectory $webDir -WindowStyle Minimized
        Start-Sleep -Seconds 3
        Write-Host "[✓] Frontend Next.js đã được bật tại http://localhost:3001!" -ForegroundColor Green
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "                      ĐÃ KHỞI ĐỘNG XONG                    " -ForegroundColor Green
Write-Host "  • Web (dữ liệu lưu trên trình duyệt): http://localhost:3001" -ForegroundColor White
# [máy chủ — đang tắt] Write-Host "  • Backend API:       http://localhost:8080             " -ForegroundColor White
# [máy chủ — đang tắt] Write-Host "  • Swagger UI Docs:   http://localhost:8080/swagger-ui.html" -ForegroundColor White
# [máy chủ — đang tắt] Write-Host "  • Database:          PostgreSQL localhost:5432 (kanadojo)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
