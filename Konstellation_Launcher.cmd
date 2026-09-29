@echo off
setlocal EnableExtensions
title Konstellation - Astrolabe

rem ============================================================
rem Konstellation portable launcher
rem Place this file in the repository root, beside package.json.
rem ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PORT=4321"

rem Theophile corpus paths used by the current Konstellation setup.
set "PACK=C:\mycode\Konstellation\Theophile_Konstellation_SemantiK_TestKit\theophile-konstellation.pack.json"
set "LENSES=C:\mycode\Konstellation\Theophile_Konstellation_SemantiK_TestKit\lenses"

echo.
echo ============================================================
echo   Konstellation - Astrolabe Launcher
echo ============================================================
echo Repo : %ROOT%
echo.

if not exist "%ROOT%\package.json" (
    echo [ERROR] package.json not found.
    echo Put this launcher in:
    echo C:\mycode\Konstellation\Konstellation
    goto :fail
)

rem Prefer the official Node install, otherwise use PATH.
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found.
    echo Konstellation requires Node.js 24.15 or newer.
    goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found.
    goto :fail
)

for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
for /f "delims=" %%V in ('npm --version') do set "NPM_VERSION=%%V"
set "NODE_VERSION_NUM=%NODE_VERSION:v=%"
for /f "tokens=1 delims=." %%M in ("%NODE_VERSION_NUM%") do set "NODE_MAJOR=%%M"

echo Node : %NODE_VERSION%
echo npm  : %NPM_VERSION%
echo.

if not defined NODE_MAJOR (
    echo [ERROR] Could not determine the Node.js version.
    goto :fail
)

if %NODE_MAJOR% LSS 24 (
    echo [ERROR] Node.js 24.15 or newer is required.
    echo Current version: %NODE_VERSION%
    goto :fail
)

if exist "%PACK%" (
    set "KONSTELLATION_PACK=%PACK%"
    echo Corpus : %PACK%
) else (
    echo [WARNING] Theophile pack not found at:
    echo %PACK%
    echo The app will start with its available/default data configuration.
)

if exist "%LENSES%" (
    set "KONSTELLATION_LENSES=%LENSES%"
    echo Lenses : %LENSES%
) else (
    echo [WARNING] Lenses folder not found at:
    echo %LENSES%
)

set "KONSTELLATION_SA_CONFIG="

rem Stop an old Node instance on the Konstellation port only.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listeners=@(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue);" ^
  "foreach($l in $listeners){" ^
  "  $p=Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue;" ^
  "  if($p -and $p.ProcessName -eq 'node'){ Stop-Process -Id $p.Id -Force }" ^
  "  elseif($p){ Write-Host ('Port %PORT% is used by ' + $p.ProcessName + ' (PID ' + $p.Id + ').'); exit 3 }" ^
  "}"
if errorlevel 1 goto :portbusy

pushd "%ROOT%"

if not exist "node_modules" (
    echo.
    echo First launch: installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        popd
        goto :fail
    )
)

echo.
echo Building Konstellation...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Server was not started.
    popd
    goto :fail
)

echo.
echo Starting Konstellation...
echo URL : http://127.0.0.1:%PORT%
echo.
echo Leave this window open while using Konstellation.
echo Press Ctrl+C or close the window to stop it.
echo.

start "" /B powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
  "$u='http://127.0.0.1:%PORT%';" ^
  "for($i=0;$i -lt 80;$i++){" ^
  "  try{" ^
  "    $r=Invoke-WebRequest -Uri ($u + '/api/health') -UseBasicParsing -TimeoutSec 1;" ^
  "    if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ Start-Process $u; exit 0 }" ^
  "  }catch{}; Start-Sleep -Milliseconds 250" ^
  "}; Start-Process $u"

call npm start
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" (
    echo.
    echo [ERROR] Konstellation stopped with exit code %RC%.
    goto :fail
)

endlocal
exit /b 0

:portbusy
echo.
echo [ERROR] Port %PORT% is already used by another application.
echo Close that application and launch Konstellation again.
goto :fail

:fail
echo.
pause
endlocal
exit /b 1
