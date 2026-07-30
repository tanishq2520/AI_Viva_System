# AI Viva Integrated Demo

## Running the full system

On Windows, use the single launcher from the project root:

```powershell
.\run_ai_viva.bat
```

On macOS or Linux, use:

```bash
chmod +x ./run_ai_viva_mac.sh
./run_ai_viva_mac.sh
```

The Windows launcher starts the integrated demo services. The macOS/Linux launcher starts the Result & Storage API, Question API, Validation API, Speech DB setup, and UI where those modules are present.

## Manual service commands

Result & Storage API:

```powershell
cd result_storage_module
python server.py
```

Frontend:

```powershell
cd "Viva_UI_Module-main\Viva_UI_Module-main"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## Demo URLs

- UI: http://127.0.0.1:5173
- Result & Storage API health: http://127.0.0.1:8010/api/health
- Questions API: http://127.0.0.1:8010/api/questions
- Latest result: http://127.0.0.1:8010/api/results/latest
- Latest feedback: http://127.0.0.1:8010/api/feedback/latest

## Workflow

1. Open the UI and go to the student viva screen.
2. Record or type answers for the demo questions.
3. Submit the viva.
4. The Result & Storage module evaluates every answer, stores the attempt in SQLite, and returns result and feedback data.
5. View the completion receipt, result dashboard, and personalized feedback pages.
