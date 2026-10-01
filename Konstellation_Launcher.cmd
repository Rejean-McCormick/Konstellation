@echo off
setlocal EnableExtensions
title Konstellation - Theophile + Graphe biblique

rem ============================================================
rem Konstellation portable launcher - corpus enrichi obligatoire
rem Place this file in the repository root, beside package.json.
rem ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PORT=4321"
set "LOCAL_PACK=%ROOT%\data\theophile-biblical.enriched.pack.json"
set "LOCAL_LENSES=%ROOT%\lenses-enriched"

 echo.
echo ============================================================
echo   Konstellation - Theophile + Graphe biblique
echo ============================================================
echo Repo : %ROOT%
echo.

if not exist "%ROOT%\package.json" (
    echo [ERROR] package.json not found.
    goto :fail
)
if not exist "%LOCAL_PACK%" (
    echo [ERROR] Enriched local pack not found:
    echo         %LOCAL_PACK%
    echo This launcher never falls back to an older external corpus.
    goto :fail
)
if not exist "%LOCAL_LENSES%" (
    echo [ERROR] Enriched lenses not found:
    echo         %LOCAL_LENSES%
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
echo Pack : %LOCAL_PACK%
echo Lenses: %LOCAL_LENSES%
echo.

if not defined NODE_MAJOR goto :badnode
if %NODE_MAJOR% LSS 24 goto :badnode

set "KONSTELLATION_PACK=%LOCAL_PACK%"
set "KONSTELLATION_LENSES=%LOCAL_LENSES%"
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
    if errorlevel 1 (popd & goto :fail)
)

echo.
echo Building Konstellation with the bundled enriched corpus...
call npm run build
if errorlevel 1 (popd & goto :fail)

echo.
echo Starting Konstellation...
echo URL : http://127.0.0.1:%PORT%
echo Expected corpus title: Theophile v0.2.1 + Graphe biblique enrichi
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
if not "%RC%"=="0" goto :fail
endlocal
exit /b 0

:badnode
echo [ERROR] Node.js 24.15 or newer is required. Current: %NODE_VERSION%
goto :fail

:portbusy
echo [ERROR] Port %PORT% is already used by another application.
goto :fail

:fail
echo.
pause
endlocal
exit /b 1
