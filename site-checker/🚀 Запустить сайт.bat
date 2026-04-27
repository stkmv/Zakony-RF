@echo off
title LawScan - Запуск сервера
color 0A
echo.
echo  ======================================
echo   LawScan - Проверка сайтов на штрафы
echo  ======================================
echo.
echo  Запускаем сервер...
echo.

:: Убиваем старый процесс на порту 3000 если есть
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Ждём секунду
timeout /t 1 /nobreak >nul

:: Переходим в папку проекта
cd /d "%~dp0"

:: Проверяем что node установлен
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ОШИБКА: Node.js не найден!
    echo  Скачайте Node.js с сайта: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Запускаем сервер в фоне
echo  Сервер запущен!
echo  Открываем браузер...
echo.
echo  Чтобы остановить сервер - закройте это окно.
echo.

:: Открываем браузер через 2 секунды
start /b cmd /c "timeout /t 2 /nobreak >nul && start "" http://localhost:3000"

:: Запускаем сервер (держим окно открытым)
node server.js
