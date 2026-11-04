@echo off
REM Local Expo wrapper for Windows. Avoids Node warning noise.
REM Do not use --no-experimental-fetch: it is invalid on Node 22+.
set NODE_OPTIONS=--no-warnings
cd /d "%~dp0"
node "%~dp0node_modules\expo\bin\cli" %*
