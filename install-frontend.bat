@echo off
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
echo.
echo Installation complete!
echo You can now run: npm run dev
pause
