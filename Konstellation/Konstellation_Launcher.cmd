@echo off
setlocal EnableExtensions
title Konstellation - Explorateur de Kristals

rem ============================================================
rem Konstellation portable launcher
rem - Detects Kristal-Kollection in several common layouts
rem - KONSTELLATION_KRISTAL_COLLECTION can explicitly point to it
rem - Generates a runtime backend config with the absolute path
rem - Legacy enriched local corpus otherwise
rem Place this file in the repository root, beside package.json.
rem ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PORT=4321"
set "LOCAL_PACK=%ROOT%\data\theophile-biblical.enriched.pack.json"
set "LOCAL_LENSES=%ROOT%\lenses-enriched"
set "RUNTIME_CONFIG=%ROOT%\.konstellation-kristal-kollection.runtime.json"
set "COLLECTION_ROOT="
set "MODE=local"

rem 1) Explicit override (best for custom layouts).
if defined KONSTELLATION_KRISTAL_COLLECTION (
    if exist "%KONSTELLATION_KRISTAL_COLLECTION%\domains" set "COLLECTION_ROOT=%KONSTELLATION_KRISTAL_COLLECTION%"
)

rem 2) Original portable layout: parent\kristals.
if not defined COLLECTION_ROOT if exist "%ROOT%\..\kristals\domains" set "COLLECTION_ROOT=%ROOT%\..\kristals"

rem 3) User/source layout: C:\mycode\Konstellation\Konstellation + C:\mycode\Kristal\Kristal-Kollection.
if not defined COLLECTION_ROOT if exist "%ROOT%\..\..\Kristal\Kristal-Kollection\domains" set "COLLECTION_ROOT=%ROOT%\..\..\Kristal\Kristal-Kollection"

rem 4) Other common sibling layouts.
if not defined COLLECTION_ROOT if exist "%ROOT%\..\Kristal-Kollection\domains" set "COLLECTION_ROOT=%ROOT%\..\Kristal-Kollection"
if not defined COLLECTION_ROOT if exist "%ROOT%\..\..\Kristal-Kollection\domains" set "COLLECTION_ROOT=%ROOT%\..\..\Kristal-Kollection"

if defined COLLECTION_ROOT set "MODE=kristals"

echo.
echo ============================================================
echo   Konstellation - Explorateur de connaissances
echo ============================================================
echo Repo : %ROOT%
if /I "%MODE%"=="kristals" (
    echo Mode : Kristal-Kollection ^(selection dans l'interface^)
    echo Collection : %COLLECTION_ROOT%
) else (
    echo Mode : corpus local enrichi
)
echo.

if not exist "%ROOT%\package.json" (
    echo [ERROR] package.json not found.
    goto :fail
)

if /I "%MODE%"=="kristals" (
    if not exist "%COLLECTION_ROOT%\domains" (
        echo [ERROR] Kristal collection not found:
        echo         %COLLECTION_ROOT%
        goto :fail
    )

    rem Resolve the path, choose a safe default Kristal, and write UTF-8 without BOM.
    set "KONSTELLATION_RUNTIME_COLLECTION=%COLLECTION_ROOT%"
    set "KONSTELLATION_RUNTIME_CONFIG=%RUNTIME_CONFIG%"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
      "$root=[IO.Path]::GetFullPath($env:KONSTELLATION_RUNTIME_COLLECTION);" ^
      "$domains=Join-Path $root 'domains';" ^
      "$preferred=@('Aging','Biology');" ^
      "$chosen=$null;" ^
      "foreach($name in $preferred){if(Test-Path (Join-Path $domains ('Kristal-' + $name))){$chosen=$name;break}};" ^
      "if(-not $chosen){$d=Get-ChildItem -LiteralPath $domains -Directory ^| Sort-Object Name ^| Select-Object -First 1; if($d){$chosen=($d.Name -replace '^Kristal[-_ ]*','')}};" ^
      "if(-not $chosen){Write-Error 'Aucun domaine Kristal trouve.';exit 2};" ^
      "$o=[ordered]@{adapter='kristal-kollection-v1';directory=$root;kristal=$chosen;title=('Kristal - ' + $chosen)};" ^
      "$json=$o ^| ConvertTo-Json -Depth 4;" ^
      "[IO.File]::WriteAllText($env:KONSTELLATION_RUNTIME_CONFIG,$json,(New-Object Text.UTF8Encoding($false)))"
    if errorlevel 1 (
        echo [ERROR] Unable to create runtime Kristal config.
        goto :fail
    )
) else (
    if not exist "%LOCAL_PACK%" (
        echo [ERROR] Enriched local pack not found:
        echo         %LOCAL_PACK%
        echo.
        echo To force a Kristal collection, set:
        echo   set KONSTELLATION_KRISTAL_COLLECTION=C:\path\to\Kristal-Kollection
        goto :fail
    )
    if not exist "%LOCAL_LENSES%" (
        echo [ERROR] Enriched lenses not found:
        echo         %LOCAL_LENSES%
        goto :fail
    )
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
if /I "%MODE%"=="kristals" (
    echo Backend : %RUNTIME_CONFIG%
) else (
    echo Pack : %LOCAL_PACK%
    echo Lenses: %LOCAL_LENSES%
)
echo.

if not defined NODE_MAJOR goto :badnode
if %NODE_MAJOR% LSS 24 goto :badnode

if /I "%MODE%"=="kristals" (
    set "KONSTELLATION_BACKEND_CONFIG=%RUNTIME_CONFIG%"
    set "KONSTELLATION_PACK="
    set "KONSTELLATION_LENSES="
) else (
    set "KONSTELLATION_BACKEND_CONFIG="
    set "KONSTELLATION_PACK=%LOCAL_PACK%"
    set "KONSTELLATION_LENSES=%LOCAL_LENSES%"
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
    if errorlevel 1 (popd & goto :fail)
)

echo.
echo Building Konstellation...
call npm run build
if errorlevel 1 (popd & goto :fail)

echo.
echo Starting Konstellation...
echo URL : http://127.0.0.1:%PORT%
if /I "%MODE%"=="kristals" (
    echo Kristal selector: enabled
) else (
    echo Corpus: Theophile v0.2.1 + Graphe biblique enrichi
)
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
