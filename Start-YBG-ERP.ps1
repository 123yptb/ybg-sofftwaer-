# YBG ERP Auto-Launcher
# Usage: powershell -ExecutionPolicy Bypass -File "e:\accouding\Start-YBG-ERP.ps1"

$Host.UI.RawUI.WindowTitle = "YBG ERP Launcher"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   YBG Yield Business Gateway - ERP System  " -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Clear ports
Write-Host "  [1/4] Clearing ports 3000 and 4005..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":(3000|4005)\s"
foreach ($conn in $connections) {
    $parts = $conn.ToString().Trim() -split "\s+"
    $pid_ = $parts[-1]
    if ($pid_ -match "^\d+$") {
        Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "    Done." -ForegroundColor Green

# 2. Start Backend
Write-Host ""
Write-Host "  [2/4] Starting Backend server (Port 4005)..." -ForegroundColor Yellow
$backendCmd = "color 0B & echo [BACKEND] Starting... & cd /d e:\accouding & npm run dev --prefix backend"
Start-Process "cmd.exe" -ArgumentList "/k", $backendCmd -WindowStyle Normal
Start-Sleep -Seconds 4
Write-Host "    Backend launched!" -ForegroundColor Green

# 3. Start Frontend
Write-Host ""
Write-Host "  [3/4] Starting Frontend server (Port 3000)..." -ForegroundColor Yellow
$frontendCmd = "color 0E & echo [FRONTEND] Starting... & cd /d e:\accouding & npm run dev --prefix frontend"
Start-Process "cmd.exe" -ArgumentList "/k", $frontendCmd -WindowStyle Normal
Write-Host "    Frontend launched!" -ForegroundColor Green

# 4. Wait for frontend to be ready
Write-Host ""
Write-Host "  [4/4] Waiting for servers to compile..." -ForegroundColor Yellow
$maxWait = 90
$waited = 0
$ready = $false
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 3
    $waited += 3
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        $ready = $true
        break
    } catch {
        Write-Host "    Waiting... ($waited/$maxWait sec)" -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($ready) {
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "   YBG ERP is READY!" -ForegroundColor Green
    Write-Host "   Opening http://localhost:3000 in Chrome..." -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
} else {
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host "   Servers still compiling - opening Chrome..." -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor Yellow
}

Start-Process "chrome.exe" "http://localhost:3000"

Write-Host ""
Write-Host "  Press any key to exit launcher..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
