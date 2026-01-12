@echo off
echo Installing dependencies...
echo.

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo Done! Dependencies installed.
pause
