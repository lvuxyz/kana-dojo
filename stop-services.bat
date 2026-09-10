@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-services.ps1"
pause
