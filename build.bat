@echo off
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%
call node_modules\.bin\vite.cmd build
