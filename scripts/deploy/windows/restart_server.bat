@echo off
cd /d %~dp0
echo === Stopping server... ===
python stop_server.py
echo === Starting server... ===
python start_server.py
echo === Done. ===
pause
