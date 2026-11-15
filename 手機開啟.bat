@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   日語冒險 - 手機開啟
echo   1. 手機和電腦連同一個 Wi-Fi
echo   2. 手機瀏覽器輸入下面任一網址：
echo ==========================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=* delims= " %%b in ("%%a") do echo     http://%%b:8000/
echo.
echo   電腦本機：http://localhost:8000/
echo   第一次執行若跳出防火牆，請按「允許」
echo   關閉此視窗即停止
echo ==========================================
python -m http.server 8000 --bind 0.0.0.0
pause
