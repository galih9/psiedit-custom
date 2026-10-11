@echo off
setlocal

:: Get the directory where this script is located
set "DIR=%~dp0"
set "HTML_FILE=%DIR%PsiEdit.html"

:: Replace backslashes with forward slashes for the file:/// URI
set "URI_PATH=%HTML_FILE:\=/%"

:: Check if PsiEdit.html exists
if not exist "%HTML_FILE%" (
    echo [ERROR] PsiEdit.html was not found in:
    echo "%DIR%"
    echo.
    echo Please run "npm run build:offline" or check the files.
    pause
    exit /b 1
)

:: Prefer Microsoft Edge in App Mode (PWA-like standalone window, no address bar)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%URI_PATH%"
    exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%URI_PATH%"
    exit /b 0
)

:: Next prefer Google Chrome in App Mode
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%URI_PATH%"
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="file:///%URI_PATH%"
    exit /b 0
)

:: Default fallback: open with default Windows browser
start "" "%HTML_FILE%"
exit /b 0
