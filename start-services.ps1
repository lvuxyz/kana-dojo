<#
.SYNOPSIS
    Khởi động toàn bộ dịch vụ Kana Dōjō: PostgreSQL 16, Spring Boot Backend, và Next.js Frontend.
#>
param (
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       KANA DŌJŌ - KHỞI ĐỘNG HỆ THỐNG TOÀN DIỆN           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. PostgreSQL
$pgPort = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($pgPort) {
    Write-Host "[✓] PostgreSQL 16 đang hoạt động trên port 5432 (PID: $($pgPort[0].OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "[i] Đang khởi động PostgreSQL 16..." -ForegroundColor Yellow
    $pgBin = Join-Path $Root ".tools\pgsql\bin\postgres.exe"
    $pgData = Join-Path $Root ".tools\pgsql\data"
    if (Test-Path $pgBin) {
        Start-Process -FilePath $pgBin -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "[✓] PostgreSQL 16 đã được khởi động!" -ForegroundColor Green
    } else {
        Write-Host "[!] Không tìm thấy thư mục PostgreSQL tại .tools\pgsql" -ForegroundColor Red
    }
}

# 2. Tìm Java 21+
$javaPath = "java"
$candidates = @(
    "C:\Program Files\JetBrains\PyCharm 2025.2.1.1\jbr\bin\java.exe",
    "C:\Program Files\Java\jdk-21\bin\java.exe",
    "C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) {
        $javaPath = $c
        break
    }
}

# 3. Spring Boot Backend
$bePort = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($bePort) {
    Write-Host "[✓] Backend Spring Boot đang chạy trên port 8080 (PID: $($bePort[0].OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "[i] Đang khởi động Spring Boot Backend với: $javaPath" -ForegroundColor Yellow
    $jarPath = Join-Path $Root "backend\target\kana-dojo-backend-1.0.0.jar"
    if (Test-Path $jarPath) {
        Start-Process -FilePath $javaPath -ArgumentList "-jar `"$jarPath`"" -WindowStyle Hidden
        Write-Host "[i] Đang chờ Backend khởi động (khoảng 5-8 giây)..." -ForegroundColor Yellow
        $ready = $false
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Seconds 1
            try {
                $check = Invoke-RestMethod -Uri "http://localhost:8080/v3/api-docs" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($check) { $ready = $true; break }
            } catch {}
        }
        if ($ready) {
            Write-Host "[✓] Backend Spring Boot đã sẵn sàng tại http://localhost:8080!" -ForegroundColor Green
        } else {
            Write-Host "[!] Backend đã khởi chạy trong nền, hãy kiểm tra http://localhost:8080" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[!] Không tìm thấy JAR tại $jarPath. Hãy chạy 'mvn clean package -DskipTests' trước." -ForegroundColor Red
    }
}

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
Write-Host "                HỆ THỐNG ĐÃ KẾT NỐI HOÀN TẤT             " -ForegroundColor Green
Write-Host "  • Frontend Web:      http://localhost:3001             " -ForegroundColor White
Write-Host "  • Backend API:       http://localhost:8080             " -ForegroundColor White
Write-Host "  • Swagger UI Docs:   http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "  • Database:          PostgreSQL localhost:5432 (kanadojo)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
