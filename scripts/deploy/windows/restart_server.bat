@echo off
setlocal
cd /d %~dp0
echo Stopping server...
python stop_server.py
timeout /t 3 /nobreak
echo Starting server...
python start_server.py
pause
