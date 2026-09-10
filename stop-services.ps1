<#
.SYNOPSIS
    Dừng toàn bộ dịch vụ Kana Dōjō: PostgreSQL 16, Spring Boot Backend, và Next.js Frontend.
#>

$ports = @(5432, 8080, 3001)

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

Write-Host "Tất cả các tiến trình trên port 5432, 8080, 3001 đã được dừng." -ForegroundColor Green
