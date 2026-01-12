@echo off
echo Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
echo.
echo Installation complete!
echo You can now run: npm run dev
pause
