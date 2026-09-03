@echo off
setlocal
cd /d "%~dp0"

set LOG=docker-run.log
echo Running docker compose in "%CD%"
echo Full output is being written to %LOG%
echo.

(
  echo ==================== docker version ====================
  docker version
  echo.
  echo ==================== port 8173 in use? ====================
  netstat -ano ^| findstr ":8173"
  echo ^(no output above means the port is free^)
  echo.
  echo ==================== compose config ====================
  docker compose config
  echo.
  echo ==================== build and start ====================
  docker compose up --build --detach
  echo.
  echo ==================== containers ====================
  docker compose ps
  echo.
  echo ==================== container logs ====================
  docker compose logs --tail=60
) > "%LOG%" 2>&1

type "%LOG%"

echo.
echo ============================================================
echo Done. The full log is at:
echo   %CD%\%LOG%
echo If it started, open:  http://localhost:8173/world-tree
echo ============================================================
echo.
pause
