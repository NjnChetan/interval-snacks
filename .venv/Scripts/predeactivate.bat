@echo off
REM Deactivate Node.js environment
if exist "%NODE_VIRTUAL_ENV%\Scripts\deactivate.bat" (
    call "%NODE_VIRTUAL_ENV%\Scripts\deactivate.bat"
)
