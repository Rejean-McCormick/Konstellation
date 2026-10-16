@echo off
setlocal EnableExtensions
title Konstellation - demonstration Theophile
rem Explicit legacy demo; never modifies a Kristal workspace.
set "KONSTELLATION_BACKEND_CONFIG="
set "KONSTELLATION_USE_LEGACY_KOLLECTION=false"
set "KONSTELLATION_USE_THEOPHILE=true"
call "%~dp0Konstellation_Launcher.cmd"
exit /b %ERRORLEVEL%
