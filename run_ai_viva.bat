@echo off
setlocal

set "ROOT=%~dp0"
set "API_DIR=%ROOT%result_storage_module"
set "UI_DIR=%ROOT%Viva_UI_Module-main\Viva_UI_Module-main"
set "QUESTION_DIR=%ROOT%ai_viva_question_module-main\ai_viva_question_module-main"
set "VALIDATION_DIR=%ROOT%Validation-Module_AI-Viva-main\Validation-Module_AI-Viva-main"
set "SPEECH_DIR=%ROOT%Viva-speech-Module-main\Viva-speech-Module-main"
set "LOG_DIR=%ROOT%.run_logs"

echo Starting AI Viva System...
echo.

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%API_DIR%\server.py" (
  echo Result ^& Storage API not found at "%API_DIR%".
  pause
  exit /b 1
)

if not exist "%UI_DIR%\package.json" (
  echo UI package.json not found at "%UI_DIR%".
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found in PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found in PATH.
  pause
  exit /b 1
)

if not exist "%UI_DIR%\node_modules" (
  echo Installing UI dependencies...
  pushd "%UI_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo npm install failed.
    pause
    exit /b 1
  )
  popd
)

if exist "%SPEECH_DIR%\setup_db.py" (
  echo Initializing Speech module database...
  pushd "%SPEECH_DIR%"
  python setup_db.py > "%LOG_DIR%\speech_setup.log" 2>&1
  popd
)

if exist "%QUESTION_DIR%\main.py" (
  if not exist "%QUESTION_DIR%\.env" (
    echo Creating local Question module .env...
    > "%QUESTION_DIR%\.env" echo DATABASE_URL=sqlite:///./question_module.db
    >> "%QUESTION_DIR%\.env" echo SECRET_KEY=ai-viva-local-dev-secret
    >> "%QUESTION_DIR%\.env" echo ALGORITHM=HS256
    >> "%QUESTION_DIR%\.env" echo ACCESS_TOKEN_EXPIRE_MINUTES=60
  )
)

if exist "%VALIDATION_DIR%\app\main.py" (
  if not exist "%VALIDATION_DIR%\.env" (
    echo Creating local Validation module .env...
    > "%VALIDATION_DIR%\.env" echo APP_NAME=AI Viva Validation Module
    >> "%VALIDATION_DIR%\.env" echo APP_ENV=development
    >> "%VALIDATION_DIR%\.env" echo DEBUG=True
    >> "%VALIDATION_DIR%\.env" echo MODEL_NAME=all-MiniLM-L6-v2
    >> "%VALIDATION_DIR%\.env" echo MULTILINGUAL_MODEL_NAME=paraphrase-multilingual-MiniLM-L12-v2
    >> "%VALIDATION_DIR%\.env" echo GEMINI_API_KEY=
  )
)

start "AI Viva Result Storage API" /D "%API_DIR%" python server.py

if exist "%QUESTION_DIR%\main.py" (
  start "AI Viva Question API" /D "%QUESTION_DIR%" python -m uvicorn main:app --host 127.0.0.1 --port 8001
)

if exist "%VALIDATION_DIR%\app\main.py" (
  start "AI Viva Validation API" /D "%VALIDATION_DIR%" cmd /k "set DEBUG=True&& set APP_ENV=development&& python -m uvicorn app.main:app --host 127.0.0.1 --port 8002"
)

start "AI Viva Proxy Server" python proxy_server.py
start "AI Viva UI" /D "%UI_DIR%" npm.cmd run dev -- --host 127.0.0.1 --port 5173

echo.
echo Proxy Server: http://127.0.0.1:8000
echo UI: http://127.0.0.1:5173
echo.
echo Speech module database is initialized. Run "%SPEECH_DIR%\viva_speech.py" manually only for microphone CLI testing.
echo Service windows have been opened. Keep them running while using the demo.
pause
