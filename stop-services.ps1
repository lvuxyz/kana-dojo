<#
.SYNOPSIS
    Dừng Kana Dōjō: Next.js Frontend (cổng 3001). Chế độ cá nhân không có PostgreSQL/Spring Boot nên không đụng tới
    cổng 5432 và 8080 (docs/LOCAL_MODE.md) — tránh tắt nhầm một PostgreSQL hay dịch vụ khác của máy.
#>

# [máy chủ — đang tắt] $ports = @(5432, 8080, 3001)
$ports = @(3001)

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -and $pidToKill -ne 0) {
            $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Dừng tiến trình trên port $port (PID: $pidToKill - $($proc.ProcessName))..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# [máy chủ — đang tắt] Write-Host "Tất cả các tiến trình trên port 5432, 8080, 3001 đã được dừng." -ForegroundColor Green
Write-Host "Đã dừng tiến trình trên port 3001." -ForegroundColor Green
