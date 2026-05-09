@echo off
title YBG ERP Launcher
color 0A

echo.
echo  ============================================
echo   YBG Yield Business Gateway - ERP System
echo  ============================================
echo.
echo  [1/3] Cleaning up old processes and cache...
echo.

:: Forcefully kill ALL dangling Node.js processes to release locked files and free ports
taskkill /F /IM node.exe > nul 2>&1

:: Wait 2 seconds for processes to fully die
timeout /t 2 /nobreak > nul

:: Delete Next.js cache to fix EPERM file lock errors
if exist "e:\accouding\frontend\.next" (
    rmdir /s /q "e:\accouding\frontend\.next"
)

echo  ✓ Cleanup complete!
echo.
echo  [2/3] Starting Backend ^& Frontend servers...
echo  Please wait...
echo.

:: Start Backend in a new YBG Frontend
start "YBG Backend (Port 4005)" cmd /k "color 0B && echo [BACKEND] Starting on port 4005... && cd /d e:\accouding && npm run dev --prefix backend"

:: Small delay so backend starts first
timeout /t 3 /nobreak > nul

:: Start Frontend in a new window YBG Frontend
start "YBG Frontend (Port 3000)" cmd /k "color 0E && echo [FRONTEND] Starting on port 3000... && cd /d e:\accouding && npm run dev --prefix frontend"

echo  Launched Backend  (Port 4005)
echo  Launched Frontend (Port 3000)
echo.
echo  [3/3] Waiting 30 seconds for servers to compile...
echo.
timeout /t 30 /nobreak > nul

echo  Opening YBG ERP in Chrome...
start chrome http://localhost:3000

echo.
echo  ============================================
echo   YBG ERP is now running!
echo   Visit: http://localhost:3000
echo  ============================================
echo.
echo  To share with your friend, open a new terminal and run:
echo  ngrok http 3000
echo.
pause
