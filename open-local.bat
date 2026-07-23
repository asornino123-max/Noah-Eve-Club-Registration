@echo off
cd /d "%~dp0"
start "Noah Eve Club Local Server" /min node server\index.js
timeout /t 2 /nobreak >nul
start http://127.0.0.1:4180/
echo Noah & Eve Club registration is opening at http://127.0.0.1:4180/
echo.
echo Keep the small server window open while previewing the site.
pause
