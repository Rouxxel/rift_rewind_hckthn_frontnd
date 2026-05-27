@echo off
echo ========================================
echo Starting Rift Rewind - Docker
echo ========================================
echo.
echo This will build and start the frontend in Docker.
echo Backend: https://rift-rewind-hckthn-backend.onrender.com
echo.
echo Access at: http://localhost:3000
echo Press Ctrl+C to stop
echo ========================================
echo.

docker-compose up --build
