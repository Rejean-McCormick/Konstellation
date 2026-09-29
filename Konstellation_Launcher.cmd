@echo off
setlocal EnableExtensions
title Konstellation v0.5

set "ROOT=C:\mycode\Konstellation\Konstellation_v0_4\Konstellation"
set "NODE_DIR=C:\Program Files\nodejs"
set "PACK=C:\mycode\Konstellation\Theophile_Konstellation_SemantiK_TestKit\theophile-konstellation.pack.json"
set "LENSES=C:\mycode\Konstellation\Theophile_Konstellation_SemantiK_TestKit\lenses"
set "PORT=4321"

echo.
echo ============================================================
echo   Konstellation v0.5 - Launcher
echo ============================================================
echo.

if not exist "%ROOT%\package.json" (
    echo [ERROR] Repo not found:
    echo %ROOT%
    goto :fail
)

if not exist "%NODE_DIR%\node.exe" (
    echo [ERROR] Node.js not found:
    echo %NODE_DIR%\node.exe
    goto :fail
)

if not exist "%NODE_DIR%\npm.cmd" (
    echo [ERROR] npm not found:
    echo %NODE_DIR%\npm.cmd
    goto :fail
)

if not exist "%PACK%" (
    echo [ERROR] Theophile pack not found:
    echo %PACK%
    goto :fail
)

if not exist "%LENSES%" (
    echo [ERROR] Lenses folder not found:
    echo %LENSES%
    goto :fail
)

rem Force official Node before Volta for this launcher only.
set "PATH=%NODE_DIR%;%PATH%"

for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
for /f "delims=" %%V in ('npm --version') do set "NPM_VERSION=%%V"

set "NODE_VERSION_NUM=%NODE_VERSION:v=%"
for /f "tokens=1 delims=." %%M in ("%NODE_VERSION_NUM%") do set "NODE_MAJOR=%%M"

echo Node : %NODE_VERSION%
echo npm  : %NPM_VERSION%
echo.

if not defined NODE_MAJOR (
    echo [ERROR] Could not determine Node.js version.
    goto :fail
)

if %NODE_MAJOR% LSS 24 (
    echo [ERROR] Konstellation requires Node 24 or newer.
    goto :fail
)

rem Configure Theophile corpus.
set "KONSTELLATION_PACK=%PACK%"
set "KONSTELLATION_LENSES=%LENSES%"
set "KONSTELLATION_SA_CONFIG="

rem Stop only an old Node process already listening on 4321.
rem If another application owns the port, do not kill it.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listeners=@(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue);" ^
  "foreach($l in $listeners){" ^
  "  $p=Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue;" ^
  "  if($p -and $p.ProcessName -eq 'node'){" ^
  "    Write-Host ('Stopping old Node instance on port %PORT% (PID ' + $p.Id + ')...');" ^
  "    Stop-Process -Id $p.Id -Force;" ^
  "  } elseif($p){" ^
  "    Write-Host ('ERROR: port %PORT% is used by ' + $p.ProcessName + ' (PID ' + $p.Id + ').');" ^
  "    exit 3;" ^
  "  }" ^
  "}"

if errorlevel 1 goto :portbusy

pushd "%ROOT%"

if not exist "public\brand-logo.svg" (
    echo [ERROR] Branding asset missing:
    echo %ROOT%\public\brand-logo.svg
    popd
    goto :fail
)

echo Building current frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed. Server was not started.
    popd
    goto :fail
)

echo.
echo Starting Konstellation...
echo URL : http://127.0.0.1:%PORT%
echo.
echo Close this window or press Ctrl+C to stop the server.
echo.

rem Wait for /api/health, then open the browser automatically.
start "" /B powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
  "$u='http://127.0.0.1:%PORT%';" ^
  "for($i=0;$i -lt 80;$i++){" ^
  "  try{" ^
  "    $r=Invoke-WebRequest -Uri ($u + '/api/health') -UseBasicParsing -TimeoutSec 1;" ^
  "    if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){Start-Process $u; exit 0}" ^
  "  }catch{};" ^
  "  Start-Sleep -Milliseconds 250;" ^
  "};" ^
  "Start-Process $u"

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
echo Port %PORT% could not be released.
echo Close the program using it, then relaunch this file.
goto :fail

:fail
echo.
pause
endlocal
exit /b 1
