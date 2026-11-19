@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===============================
echo  METEOLIVE PRO - START
echo ===============================
where py >nul 2>nul
if %errorlevel%==0 goto python_py
where python >nul 2>nul
if %errorlevel%==0 goto python_exe
echo Nie znaleziono Python. Uzyj rozszerzenia Live Server w VS Code.
pause
exit /b 1
:python_py
start "" "http://localhost:5500"
py serwer.py 5500
pause
exit /b
:python_exe
start "" "http://localhost:5500"
python serwer.py 5500
pause
