@echo off
title GachaWiki Play Helper - Install
setlocal
echo.
echo   GachaWiki Play Helper - Chrome / Brave installer
echo   ================================================
echo.

rem Copy the extension to a permanent home (so the Downloads folder can be deleted)
set "DEST=%LOCALAPPDATA%\GachaWikiPlayHelper"
if exist "%DEST%" rd /s /q "%DEST%"
xcopy "%~dp0chrome-extension" "%DEST%\chrome-extension\" /e /i /q >nul
echo   Files copied to:
echo     %DEST%\chrome-extension
echo.

rem Open the extensions page in Brave if installed, otherwise Chrome
set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
if exist "%BRAVE%" (
  start "" "%BRAVE%" "brave://extensions"
  echo   Brave is opening its Extensions page...
) else (
  start "" "chrome://extensions"
  echo   Chrome is opening its Extensions page...
)
echo.
echo   NOW DO THESE 3 CLICKS in the browser window that just opened:
echo.
echo     1. Turn ON  "Developer mode"   (toggle at the top-right)
echo     2. Click    "Load unpacked"
echo     3. Paste this into the folder box and press Enter:
echo.
echo        %DEST%\chrome-extension
echo.
echo   Done! Pin the icon via the puzzle-piece menu.
echo.
pause
