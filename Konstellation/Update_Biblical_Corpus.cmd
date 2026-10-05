@echo off
setlocal EnableExtensions
title Konstellation - Mise a jour du graphe biblique

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "CURRENT=%ROOT%\data\biblical.pack.local.json"
set "TEMP=%ROOT%\data\biblical.pack.updated.json"
set "ENRICHED=%ROOT%\data\theophile-biblical.enriched.pack.json"

pushd "%ROOT%"
if not exist "scripts\update-biblical-corpus.mjs" goto :missing
if not exist "scripts\build-theophile-enriched-pack.py" goto :missing
if not exist "%CURRENT%" goto :missing

where node >nul 2>nul || (echo [ERROR] Node.js introuvable. & goto :fail)

echo Mise a jour de BibleData dans un fichier temporaire...
if /I "%~1"=="offline" (
  node scripts\update-biblical-corpus.mjs --offline --base=data\demo.pack.json --output=data\biblical.pack.updated.json
) else (
  node scripts\update-biblical-corpus.mjs --base=data\demo.pack.json --output=data\biblical.pack.updated.json
)
if errorlevel 1 goto :fail

rem Refuse a degraded update: the shipped full graph has roughly 3000 named people.
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const n=p.entities.filter(e=>e.type==='person').length; console.log('Personnages:',n); if(n<3000) process.exit(7)" "%TEMP%"
if errorlevel 1 (
  echo [WARNING] Mise a jour incomplete. Le pack existant est conserve.
  del /q "%TEMP%" >nul 2>nul
  goto :fail
)

copy /y "%CURRENT%" "%CURRENT%.bak" >nul
move /y "%TEMP%" "%CURRENT%" >nul

echo Reconstruction du pack Theophile + Bible...
where py >nul 2>nul
if not errorlevel 1 (
  py -3 scripts\build-theophile-enriched-pack.py
) else (
  where python >nul 2>nul || (echo [ERROR] Python introuvable pour reconstruire le pack enrichi. & goto :restore)
  python scripts\build-theophile-enriched-pack.py
)
if errorlevel 1 goto :restore

echo.
echo [OK] Graphe biblique et pack enrichi mis a jour.
echo %ENRICHED%
popd
pause
endlocal
exit /b 0

:restore
echo [ERROR] Reconstruction echouee. Restauration du graphe biblique precedent.
if exist "%CURRENT%.bak" copy /y "%CURRENT%.bak" "%CURRENT%" >nul
goto :fail

:missing
echo [ERROR] Fichier requis introuvable dans %ROOT%.
:fail
popd
pause
endlocal
exit /b 1
