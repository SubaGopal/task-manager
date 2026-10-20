@echo off
cd /d D:\task-manager
start "" "C:\Program Files\Java\jdk-21\bin\javaw.exe" -jar target\task-manager-1.0.0.jar
timeout /t 4 /nobreak >nul
start "" msedge.exe --app="file:///D:/task-manager/frontend/index.html"
exit