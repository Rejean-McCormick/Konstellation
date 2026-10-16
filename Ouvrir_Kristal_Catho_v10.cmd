@echo off
setlocal EnableExtensions
title Konstellation - Kristal Catho v10
rem Read-only local reader. Catho stays in C:\mycode\Kristal\locals\A-Kristal-Catho.
rem The reader config is explicit; no filesystem scan or hidden fallback to Theophile.
set "CATHO=C:\mycode\Kristal\locals\A-Kristal-Catho"
if not exist "%CATHO%\kristal.workspace.json" (
  echo [ERROR] Kristal Catho introuvable :
  echo         %CATHO%
  echo Verifier la presence de kristal.workspace.json sans deplacer le Kristal.
  pause
  exit /b 1
)
set "KONSTELLATION_DEPLOYMENT_PROFILE=local"
set "HOST=127.0.0.1"
set "KONSTELLATION_ANONYMOUS_READONLY=false"
set "KONSTELLATION_PUBLIC_READONLY=false"
set "KONSTELLATION_ENABLE_MY_KRISTALS=true"
set "KONSTELLATION_BACKEND_CONFIG=%~dp0config\active-reader.json"
set "KONSTELLATION_USE_THEOPHILE=false"
if not exist "%KONSTELLATION_BACKEND_CONFIG%" (
  echo [ERROR] Configuration du lecteur absente.
  pause
  exit /b 1
)
call "%~dp0Konstellation_Launcher.cmd"
exit /b %ERRORLEVEL%
