@echo off
setlocal
rem Read-only local My Kristals preview. Does not change canonical state or publish.
set "KONSTELLATION_DEPLOYMENT_PROFILE=local"
set "KONSTELLATION_ENABLE_MY_KRISTALS=true"
rem Set KONSTELLATION_FLEET_EXPORT to an explicitly reviewed local JSON file
rem before launching this wrapper. Never export secrets or private paths.
call "%~dp0Konstellation_Launcher.cmd"
