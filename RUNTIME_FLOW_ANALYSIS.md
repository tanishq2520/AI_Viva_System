# Runtime Flow Analysis

**Analysis date:** 2026-09-12  
**Scope:** Actual runtime tracing from `run_ai_viva.bat` through the React UI and one complete browser-based Student Viva attempt.  
**Verification method:** `PROJECT_ARCHITECTURE_REPORT.md` was read first, then the launcher, frontend entry/routes/hooks/pages, proxy, result API/storage, and validation API were checked directly against source code.  
**Code changes:** None. Only this analysis file was created.

## Status Legend

- **CONFIRMED:** Directly visible in source code.
- **SIMULATED:** UI state or generated data represents behavior without the underlying implementation.
- **FALLBACK:** Used only when the preferred path is unavailable or returns no usable data.
- **DISCONNECTED:** Exists in the repository but is not connected to the active browser flow.
- **BROKEN/MISMATCHED:** The caller and callee contracts do not match, or the source path cannot complete as intended.
- **ENVIRONMENT-DEPENDENT:** Depends on browser support, permissions, installed packages, models, or runtime configuration.

## 1. Runtime Scope and Actual Active Pipeline

The active Windows/browser pipeline is:

```text
run_ai_viva.bat
  -> five launched processes/windows
  -> Vite serves React UI on :5173
  -> browser loads src/main.tsx -> App.tsx
  -> Student routes render VivaExamination.tsx
  -> browser localStorage supplies questions and identity
  -> browser Web Speech API supplies transcript text
  -> UI POST /api/attempts to proxy :8000
  -> proxy forwards to Result Storage API :8010
  -> result storage calls Validation API :8002/validate
  -> result storage attempts :8002/evaluate
  -> /evaluate is not registered by the inspected validation router
  -> result storage uses local evaluation fallback
  -> result storage writes viva_history.db
  -> UI retrieves and renders the stored result
```

The Python speech CLI and standalone OpenAI evaluator do not participate in this active path.

## 2. Startup Trace: `run_ai_viva.bat` to React UI

### 2.1 Launcher initialization

**File:** `run_ai_viva.bat`

The batch file sets these root-relative variables:

| Variable | Resolved purpose |
|---|---|
| `ROOT` | Directory containing `run_ai_viva.bat` |
| `API_DIR` | `result_storage_module` |
| `UI_DIR` | `Viva_UI_Module-main\Viva_UI_Module-main` |
| `QUESTION_DIR` | `ai_viva_question_module-main\ai_viva_question_module-main` |
| `VALIDATION_DIR` | `Validation-Module_AI-Viva-main\Validation-Module_AI-Viva-main` |
| `SPEECH_DIR` | `Viva-speech-Module-main\Viva-speech-Module-main` |
| `LOG_DIR` | Root `.run_logs` directory |

**Confirmed checks:**

1. Creates `.run_logs` if absent.
2. Requires `result_storage_module/server.py`.
3. Requires UI `package.json`.
4. Requires `python` in `PATH`.
5. Requires `npm` in `PATH`.
6. Runs `npm install` in the UI directory only when `node_modules` is absent.

**Status:** CONFIRMED. The launcher does not install Python requirements.

### 2.2 Speech database setup

**Command:**

```bat
pushd "%SPEECH_DIR%"
python setup_db.py > "%LOG_DIR%\speech_setup.log" 2>&1
popd
```

**File/function:** `Viva-speech-Module-main/Viva-speech-Module-main/setup_db.py` -> `create_database()`.

**Database:** `Viva-speech-Module-main/Viva-speech-Module-main/viva.db` because the script uses the relative `DB_NAME = "viva.db"` while its working directory is changed to `SPEECH_DIR`.

**Effect:** Creates table `viva_questions` and inserts five standalone speech questions if the table is empty.

**Status:** CONFIRMED setup-only operation. **DISCONNECTED** from the browser viva. The batch file does not run `viva_speech.py`.

### 2.3 Question API environment creation

If `QUESTION_DIR/main.py` exists and `.env` does not, the launcher writes:

```text
DATABASE_URL=sqlite:///./question_module.db
SECRET_KEY=ai-viva-local-dev-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

**File consuming it:** `ai_viva_question_module-main/ai_viva_question_module-main/database.py` -> `Settings`.

**Database:** Relative SQLite URL resolves from the Question API working directory to the Question module directory.

**Status:** CONFIRMED preparation. This service is not the normal source of questions in the browser viva when localStorage contains active questions.

### 2.4 Validation API environment creation

If `VALIDATION_DIR/app/main.py` exists and `.env` does not, the launcher writes:

```text
APP_NAME=AI Viva Validation Module
APP_ENV=development
DEBUG=True
MODEL_NAME=all-MiniLM-L6-v2
MULTILINGUAL_MODEL_NAME=paraphrase-multilingual-MiniLM-L12-v2
GEMINI_API_KEY=
```

**File consuming it:** `Validation-Module_AI-Viva-main/Validation-Module_AI-Viva-main/app/config/config.py` -> `Settings`.

The launcher explicitly starts the API on port `8002`; the config's default `PORT=8000` is not used by the launcher command.

**Status:** CONFIRMED preparation. Model loading is environment-dependent.

## 3. Exact Processes and Ports Opened by the Launcher

| Order | Batch command | Working directory | Process/service | Port | Runtime status |
|---:|---|---|---|---:|---|
| 1 | `start ... python server.py` | `result_storage_module` | Result Storage API | 8010 | CONFIRMED active server if process starts |
| 2 | `start ... python -m uvicorn main:app ... --port 8001` | Question module directory | Question API | 8001 | CONFIRMED active server if import/config succeeds |
| 3 | `start ... cmd /k "set ... && python -m uvicorn app.main:app ... --port 8002"` | Validation module directory | Validation API | 8002 | CONFIRMED active server if dependencies/import/model paths permit |
| 4 | `start ... python proxy_server.py` | Repository root inherited/current directory | API proxy | 8000 | CONFIRMED active server if `httpx`/FastAPI/Uvicorn import succeeds |
| 5 | `start ... npm.cmd run dev -- --host 127.0.0.1 --port 5173` | UI directory | Vite development server | 5173 | CONFIRMED active server if npm/dependencies succeed |

### Startup properties

- The batch file uses `start`, so each service is launched in a separate Windows process/window.
- It does not wait for health checks.
- It does not verify that a process successfully bound its port.
- It does not restart a failed process.
- The validation command deliberately uses `cmd /k`, leaving that command window open.
- The launcher itself ends at `pause`; the services continue independently.

**Status:** CONFIRMED. Multiple windows are caused by the five `start` commands, not by React opening terminals.

## 4. From Vite to React Application

### 4.1 Vite command

**Launcher command:**

```bat
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

**File:** `Viva_UI_Module-main/Viva_UI_Module-main/package.json`.

`npm run dev` executes `vite`. Vite serves `index.html` from the UI project directory.

**Port:** `127.0.0.1:5173`.

### 4.2 Browser entry

**File:** `Viva_UI_Module-main/Viva_UI_Module-main/src/main.tsx`.

Exact entry behavior:

```text
getElementById("root")
  -> React createRoot(...)
  -> <StrictMode>
  -> <App />
```

`main.tsx` imports `index.css` and `App.tsx`.

### 4.3 Route and authentication initialization

**File:** `Viva_UI_Module-main/Viva_UI_Module-main/src/App.tsx`.

`App()` renders:

```text
<AuthProvider>
  <BrowserRouter>
    <Routes>...</Routes>
  </BrowserRouter>
</AuthProvider>
```

The Student route relevant to the viva is:

```text
/student/viva -> StudentLayout -> VivaExamination
```

**File:** `src/contexts/AuthContext.tsx` -> `AuthProvider()`.

On mount, `AuthProvider`:

1. Inspects `window.location.pathname`.
2. Assigns `targetRole = "student"` for `/student...` routes.
3. Looks for `viva_session_student`, then `viva_session` in browser localStorage.
4. If no valid session exists, installs `DEFAULT_STUDENT` in React state without contacting a backend.
5. `DEFAULT_STUDENT` has roll number `CS21B04` and name `Akash`.

**Status:** CONFIRMED. Student login is local/default initialization, not a backend authentication step. **SIMULATED/UNPROTECTED:** A login form can call `AuthContext.login()`, but that method falls back to a default user and returns `true` without validating the password against a server.

## 5. Student Question Selection and Loading

### 5.1 Source of available sessions

**File:** `src/services/questionBank.ts` -> `getBankQuestions()` and `getUpcomingSessionsFromBank()`.

`getBankQuestions()` reads localStorage key:

```text
viva_question_bank
```

Behavior:

- If the key is absent, writes `INITIAL_BANK_QUESTIONS` and returns them.
- If the stored value is invalid/empty, replaces it with the initial bank.
- If no stored subject contains `data structure`, merges the initial default questions into the stored list.

`getUpcomingSessionsFromBank()`:

1. Filters to `status === "active"`.
2. Groups questions by `subject`.
3. Creates one scheduled session object per subject.
4. Uses `rawSubject`, display subject, question count, and summed time limits.
5. Does not call any backend API.

**Storage:** browser localStorage only.

**Status:** CONFIRMED active source. **DISCONNECTED from Question API DB:** Normal faculty question creation/edit/delete and the student session list use localStorage.

### 5.2 Student chooses a session

**File:** `src/pages/student/StudentDashboard.tsx` -> `startExam(session)`.

When the student selects a session:

```text
localStorage.setItem("selected_viva_subject", session.rawSubject)
localStorage.setItem("selected_viva_title", session.subject)
navigate("/student/instructions")
```

**Storage:** `selected_viva_subject`, `selected_viva_title`.

**Status:** CONFIRMED. No backend exam/session ID is sent or stored.

### 5.3 Viva screen initial question selection

**File:** `src/pages/student/VivaExamination.tsx`.

At component initialization:

```text
loadBankQuestions()
  -> getQuestionsForSubject()
  -> getActiveBankQuestions()
  -> filter by selected_viva_subject
  -> map BankQuestion to VivaQuestion
```

The mapped frontend question contains:

- Numeric sequential `id` generated from array index (`idx + 1`).
- `question` text.
- `category`.
- `difficulty`.
- `expectedKeywords` derived from the local answer.
- `timeLimit`.

The initial `questions` state uses local bank questions if any; otherwise it uses `demoQuestions` from `src/services/api.ts`.

A mount `useEffect` repeats the decision:

- If local bank questions exist, it sets them and returns.
- Only if no local bank questions exist does it call `fetchQuestions()`.
- `fetchQuestions()` requests `GET /api/questions` through the proxy.
- If that request fails, `loadError` is set to `Using built-in demo questions.`; the current state remains the initial built-in demo list.

**Status:** CONFIRMED. In a normal initialized browser, `/api/questions` is not called for the viva because `getBankQuestions()` seeds five local questions first.

### 5.4 Expected answer source

When final submission builds each answer object, `VivaExamination.tsx` includes:

```text
expectedAnswer: usingBankQuestions ? getBankAnswer(idx) : undefined
```

For localStorage questions, `getBankAnswer(idx)` reads the matching local bank question's `answer` field.

For backend/demo questions, `expectedAnswer` is omitted. In `storage.save_attempt()`, omitted expected answers fall back to `questionText`, not the `DEMO_QUESTIONS` answer field.

**Status:** CONFIRMED. Local bank path has an expected answer; backend/demo fallback has a reference-answer mismatch.

## 6. Speaking the Question and Capturing the Student Answer

### 6.1 Question playback

**File:** `src/hooks/useSpeechQuestion.ts` used by `VivaExamination.tsx`.

When `question?.question` changes, a 400 ms delayed effect calls:

```text
speech.speak(question.question)
```

This is browser-side text-to-speech. It does not call the Python speech module, Edge TTS, or an HTTP endpoint.

**Status:** CONFIRMED browser TTS. The Python `speak_question.py` and `viva_speech.py` path is DISCONNECTED.

### 6.2 Microphone permission and camera setup

**File:** `VivaExamination.tsx` -> `setupCamera()`.

On mount it calls:

```text
navigator.mediaDevices.getUserMedia({ video: true })
```

It attaches the returned stream to the `<video>` element and stops tracks on cleanup.

**Status:** CONFIRMED local camera preview only. No audio track is requested by this call, no video is uploaded, and no backend proctoring service receives the stream.

### 6.3 Start recording button

**File:** `VivaExamination.tsx` -> `handleStartRecording()`.

The function calls, in order:

```text
recorder.startRecording()
recognition.reset()
recognition.start()
qTimer.start()
speech.cancel()
```

The recorder implementation is:

**File:** `src/hooks/useVoiceRecorder.ts` -> `startRecording()`.

It only executes:

```text
setState("recording")
```

The source comment explicitly says a real MediaRecorder implementation would be future work.

**Status:** `recorder.startRecording()` is SIMULATED UI state. It does not access a microphone, create a Blob, write a file, or upload audio.

### 6.4 Browser speech recognition

**File:** `src/hooks/useSpeechRecognition.ts` -> `start()`.

The hook resolves a browser constructor once at module scope:

```text
window.SpeechRecognition || window.webkitSpeechRecognition
```

If unavailable, `supported` is false and `start()` returns without starting recognition.

If available, `start()` creates a recognition object and sets:

```text
continuous = true
interimResults = true
lang = "en-US"
maxAlternatives = 1
```

Event flow:

| Browser event | Source behavior | React state effect |
|---|---|---|
| `onstart` | Marks recognition active | `isListening = true` |
| `onresult` final result | Appends final transcript text to previous transcript | `transcript` grows |
| `onresult` interim result | Stores current interim text | `interimTranscript` changes |
| `onerror` | Logs non-aborted error and stops active state | `isListening = false`, interim cleared |
| `onend` | Marks recognition inactive | `isListening = false`, interim cleared |

No confidence value is read from `result[0]`. No audio buffer is returned to React.

**Status:** CONFIRMED browser Web Speech API transcript. **ENVIRONMENT-DEPENDENT:** Browser support, microphone permission, and browser speech implementation.

### 6.5 Transcript-to-answer state synchronization

**File:** `VivaExamination.tsx` effect watching:

```text
recognition.transcript
recognition.interimTranscript
question?.id
```

It combines final and interim text and writes:

```text
setAnswers(prev => ({ ...prev, [question.id]: combined.trim() }))
```

The typed `<textarea>` writes to the same `answers[question.id]` state and can replace/edit the recognition result.

**Storage:** React component state only at this stage. It is not persisted to localStorage and is not sent to the backend until final submission.

### 6.6 Saving one question answer

**File:** `VivaExamination.tsx` -> `handleSubmitAnswer()`.

It:

1. Stops the simulated recorder.
2. Stops browser speech recognition.
3. Stops the per-question timer.
4. If the transcript exists and there is not already an answer, copies the final transcript into `answers[question.id]`.
5. Adds the current index to `answeredQuestions`.
6. Resets recorder and recognition state.
7. Advances to the next question and resets the question timer when another question exists.

**Status:** CONFIRMED state transition. No per-question API request occurs here.

## 7. Live Monitoring Side Path During the Viva

**File:** `VivaExamination.tsx` telemetry effect.

Every second, it writes a `liveSessionData` object to:

```text
localStorage key: viva_active_session
```

The object includes student name/ID, subject, question number, total questions, elapsed time, a computed display score, status, last transcript, and timestamp.

**File:** `src/pages/faculty/LiveMonitoring.tsx`.

The faculty page reads that same browser localStorage key every 1.5 seconds.

**Status:** CONFIRMED same-origin browser-localStorage communication. **SIMULATED/DISCONNECTED:** It is not a server telemetry channel, does not work as a cross-device monitoring service, and does not transmit camera/audio data.

Faculty flags use:

```text
viva_suspicious_flag
```

The student viva polls that key every 1.5 seconds and displays a warning if it is less than three minutes old. This is also localStorage-only.

## 8. Final Student Submission to Result Storage

### 8.1 Submit handler

**File:** `VivaExamination.tsx` -> `handleFinalSubmit()`.

It first:

```text
setSubmitting(true)
speech.cancel()
recognition.stop()
```

It computes the subject with `getBankSubject()`, then calls `submitAttempt()` with:

```json
{
  "studentId": "user.rollNumber or user.id or CS21B04",
  "studentName": "user.name or Akash",
  "subject": "selected title or derived subject",
  "durationSeconds": "initialTime - examTimer.seconds",
  "answers": [
    {
      "questionId": 1,
      "answer": "answers[item.id] or empty string",
      "questionText": "item.question",
      "category": "item.category",
      "expectedAnswer": "local bank answer when usingBankQuestions"
    }
  ]
}
```

**Important implementation note:** The TypeScript declaration for `submitAttempt()` lists answer elements with only `questionId` and `answer`, while the actual object passed by `VivaExamination.tsx` includes `questionText`, `category`, and `expectedAnswer`. At runtime the JavaScript object contains those extra fields, and the Python API consumes them. This is a type-contract inconsistency, not a separate runtime service.

### 8.2 Frontend API client

**File:** `src/services/api.ts` -> `submitAttempt(payload)`.

It uses:

```text
API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
```

Then performs:

```text
fetch("http://127.0.0.1:8000/api/attempts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
```

A non-2xx response throws `Error("API request failed: status")`.

**Port:** 8000 at the browser boundary.

### 8.3 Proxy route

**File:** `proxy_server.py` -> wildcard `proxy(request, path)`.

For path `api/attempts`, the route matches the third branch:

```text
path.startswith("api/attempts")
```

It constructs:

```text
http://127.0.0.1:8010/api/attempts
```

Then forwards method, query string, headers except `host`, and the raw request body using the global `httpx.AsyncClient`.

**Port transition:** `5173 browser -> 8000 proxy -> 8010 result API`.

**Status:** CONFIRMED.

### 8.4 Result API handler

**File:** `result_storage_module/server.py` -> `VivaApiHandler.do_POST()`.

The result API accepts POST only for exact path:

```text
/api/attempts
```

It:

1. Reads `Content-Length` bytes.
2. Decodes JSON.
3. Calls `save_attempt(payload)`.
4. Returns `{ "result": result }` with status 201.
5. Converts any exception into HTTP 400 with `{ "error": str(exc) }`.

**Port:** 8010.

## 9. Per-Answer Validation and Evaluation

### 9.1 Question payload normalization

**File:** `result_storage_module/storage.py` -> `save_attempt(payload)`.

Since the submitted `answers` list is non-empty, each item is normalized to:

```text
id = item.questionId or array index + 1
question = item.questionText or "Question N"
answer = item.expectedAnswer or item.questionText or ""
category = item.category or "General Viva"
student_answer = trimmed item.answer or ""
```

For the normal localStorage bank, `expectedAnswer` is present and the local bank's answer is used.

For the backend/demo fallback, `expectedAnswer` is absent and the question text becomes the expected answer. This is CONFIRMED from the `or` chain.

### 9.2 Empty-answer branch

If `student_answer` is empty, `save_attempt()` does not call the Validation API or evaluation endpoint. It creates fixed values:

```text
validation_status = "Unanswered"
score = 0
verdict = "incorrect"
feedback = "No answer recorded."
```

**Status:** CONFIRMED. This is a direct unanswered branch, not a model decision.

### 9.3 Non-empty validation request

For a non-empty answer, `save_attempt()` calls:

**Function:** `storage.validate_answer(question_text, expected_answer, student_answer)`.

**Endpoint:**

```text
POST http://127.0.0.1:8002/api/v1/validate
```

**Body:**

```json
{
  "question": "question text",
  "expected_answer": "reference answer",
  "student_answer": "browser transcript or typed text",
  "language": "English"
}
```

The result API calls port 8002 directly, not through the proxy.

### 9.4 Validation router

**File:** `Validation-Module_AI-Viva-main/Validation-Module_AI-Viva-main/app/main.py`.

`app.include_router(validation_router, prefix="/api")`.

**File:** `app/api/v1/validation.py`.

The router has prefix `/v1`, and registers exactly:

```text
POST /validate
```

Combined endpoint:

```text
POST /api/v1/validate
```

The handler `validate_student_answer()` injects `ValidationService` and returns `service.validate_answer(request)`.

### 9.5 Validation implementation selection

The module uses:

```python
try:
    from app.services.validation_service import ValidationService
except ModuleNotFoundError:
    from app.services.lightweight_validation_service import LightweightValidationService as ValidationService
```

This is a module-import fallback, not a runtime catch for all model-loading errors.

#### Heavy path: `ValidationService.validate_answer()`

When the heavy service imports successfully, it may:

1. Retrieve a reference answer with `RAGService` only when `expected_answer` is blank.
2. Optionally translate when metadata requests it.
3. Optionally call Gemini only when metadata requests LLM use and `GEMINI_API_KEY` exists.
4. Clean text with `TextProcessor`.
5. Reject empty/short/repetitive/gibberish transcripts.
6. Load/generate embeddings.
7. Calculate cosine similarities.
8. Calculate concept coverage and completeness.
9. Run zero-shot classification.
10. Return `ValidationResponse`.

The active `storage.validate_answer()` sends no `speech_metadata`, so Gemini, local QA LLM, translation, and generated-feedback branches are not requested by the active result path.

#### Lightweight path: `LightweightValidationService.validate_answer()`

If selected, it:

- Rejects empty answers.
- Rejects fewer than three meaningful tokens.
- Computes set overlap between answer and expected tokens.
- Returns Valid/Complete for similarity `>= 0.60`.
- Returns Valid/Partially Complete for similarity `>= 0.25`.
- Otherwise returns Invalid/Irrelevant.

**Status:** CONFIRMED implementation options. **ENVIRONMENT-DEPENDENT:** Which service actually runs depends on imports and installed dependencies.

### 9.6 Validation fallback in result storage

`storage.validate_answer()` catches:

```text
urllib.error.URLError
TimeoutError
json.JSONDecodeError
```

and calls `local_validate_answer()`.

The local fallback tokenizes the answer and expected answer, computes intersection/expected-token count, and returns a validation object. It does not use embeddings or NLI.

**Status:** FALLBACK. This path is used when the HTTP request cannot complete or cannot decode JSON.

### 9.7 Evaluation request

After validation, `save_attempt()` calls:

**Function:** `storage.evaluate_answer(question, expected_answer, student_answer)`.

**Endpoint:**

```text
POST http://127.0.0.1:8002/api/v1/evaluate
```

**Body:**

```json
{
  "question": "question text",
  "expected_answer": "reference answer",
  "student_answer": "browser transcript or typed text"
}
```

### 9.8 Actual evaluation route status

The inspected validation router registers only `/api/v1/validate`. No `/api/v1/evaluate` route is defined in the inspected Validation API source.

Therefore, with the shown source running on port 8002, the evaluation request reaches FastAPI and should receive a 404 response. Python `urllib.request.urlopen()` raises `urllib.error.HTTPError`, which is a subclass of `URLError`. The `except (urllib.error.URLError, TimeoutError, json.JSONDecodeError)` in `evaluate_answer()` catches it and calls `local_evaluate_answer()`.

**Status:** BROKEN/MISMATCHED endpoint contract followed by CONFIRMED local fallback.

### 9.9 Local evaluation fallback

`local_evaluate_answer()`:

1. Extracts expected keywords, or question keywords if expected answer is empty.
2. Tokenizes the student response.
3. Returns score 0 for empty text.
4. Computes expected-keyword coverage.
5. Assigns:
   - coverage `>= 0.70`: score 8, Correct;
   - coverage `>= 0.40`: score 6, Partially Correct;
   - lower coverage with at least 5 words: score 5, Partially Correct;
   - otherwise: score 3, Incorrect.
6. Produces strengths, missing points, and generic feedback.

After this function returns, `save_attempt()` applies another rule:

```text
if answer has at least 2 words and score < 5:
    score = at least 5, bounded by len(words) * 2 and 10
    incorrect -> partially_correct
```

**Status:** CONFIRMED fallback scoring. This is not the standalone OpenAI evaluator and does not call OpenAI.

## 10. Result Calculation and SQLite Storage

### 10.1 Attempt totals

After all submitted answer items are evaluated, `save_attempt()` calculates:

```text
attempted = number of answers with non-empty studentAnswer
total_score = sum(answer scores)
max_score = number of evaluated questions * 10
percentage = round(total_score / max_score * 100, 2)
created_at = UTC ISO timestamp
```

Grade function `grade_for()` assigns:

```text
>= 90 -> A+
>= 80 -> A
>= 70 -> B+
>= 60 -> B
>= 50 -> C
else  -> Needs Review
```

### 10.2 Database path

**File:** `result_storage_module/storage.py`.

```python
DB_PATH = Path(__file__).resolve().parent / "viva_history.db"
```

The active result database is therefore independent of the process current directory.

### 10.3 Insert operations

`save_attempt()` calls `init_db()` and inserts one row into:

```text
viva_attempts
```

It then inserts one row for each evaluated answer into:

```text
viva_answers
```

The `viva_answers.attempt_id` value links each answer to the parent attempt. The stored validation response is JSON-serialized into the `validation` column; strengths and missing points are also JSON-serialized.

### 10.4 Returned result

`save_attempt()` calls `get_attempt(attempt_id)` after insertion.

`get_attempt()`:

1. Selects the parent row by ID.
2. Selects child answers ordered by `question_id`.
3. Calls `format_attempt()`.

`format_attempt()` returns:

- identity/subject/date/duration;
- overall percentage/grade/totals;
- derived five metrics;
- category section scores;
- answer details;
- feedback summary.

The result API wraps that object:

```json
{
  "result": { ...formatted attempt... }
}
```

with HTTP 201.

## 11. Submission Response and Navigation

Back in `VivaExamination.tsx`, `submitAttempt()` resolves the returned result.

If `res.id` exists:

```text
localStorage.setItem("viva_last_completed_attempt_id", String(res.id))
```

Then it:

1. Stops the local camera stream.
2. Removes `viva_active_session` from localStorage.
3. Navigates to `/student/completion`.

**Status:** CONFIRMED successful path.

### Submission failure path

If any error is thrown by `submitAttempt()`:

1. `loadError` becomes `Could not save attempt. Navigating to completion...`.
2. Camera is stopped.
3. `viva_active_session` is removed.
4. After one second, UI navigates to `/student/completion` anyway.

**Status:** CONFIRMED. **MISLEADING/SIMULATED outcome:** The completion page can be shown even when no result was stored.

## 12. Student Result Display Runtime

### 12.1 Completion page

**Route:** `/student/completion`.

**File:** `src/pages/student/VivaCompletion.tsx`.

On mount it calls:

```text
fetchLatestResult()
```

which requests:

```text
GET http://127.0.0.1:8000/api/results/latest
```

The proxy routes this to:

```text
GET http://127.0.0.1:8010/api/results/latest
```

The result API calls `get_latest_attempt()` and returns the newest attempt globally.

The completion page displays the returned subject, student ID, attempted count, duration, and session ID. If the request fails or returns null, it displays defaults/placeholders such as `Data Structures & Algorithms`, `CS21B045`, and `—`.

**Status:** CONFIRMED. **Potentially misleading:** It uses the globally latest attempt, not the `viva_last_completed_attempt_id` saved by the submitting student.

### 12.2 Result dashboard attempt list

**Route:** `/student/results`.

**File:** `src/pages/student/ResultDashboard.tsx`.

First effect:

1. Reads `user.rollNumber` or `user.id` from `AuthContext`.
2. Calls `fetchStudentAttempts(studentId)`.
3. Requests:

```text
GET /api/attempts/student/{encodedStudentId}
```

through proxy 8000, then result API 8010.

4. The result API calls `get_student_attempts(student_id)` against `viva_history.db`.
5. The API returns attempt summaries ordered newest first.
6. The component chooses an attempt ID using this priority:
   - `viva_last_completed_attempt_id`, if it appears in the returned list;
   - `selected_result_attempt_id`, if it appears in the list;
   - first returned attempt ID.
7. It writes the chosen ID to `selected_result_attempt_id`.

**Status:** CONFIRMED. Student ID is only a URL parameter; backend ownership is not checked.

### 12.3 Result dashboard detail request

Second effect runs when `selectedAttemptId` changes.

It calls:

```text
fetchAttemptById(selectedAttemptId)
```

which requests:

```text
GET /api/attempts/{encodedAttemptId}
```

through proxy 8000 to result API 8010.

The result API:

1. Parses the ID as an integer.
2. Calls `get_attempt_by_id()` aliasing `get_attempt()`.
3. Loads `viva_attempts` and associated `viva_answers`.
4. Formats the full result.
5. Returns `{ "result": formattedAttempt }`.

The page then renders:

- overall score and grade;
- attempted count and duration;
- five derived metrics;
- radar chart and section scores;
- answer details and feedback;
- performance trend.

If the detail request returns null/errors, the page falls back to `fetchLatestResult()` rather than strictly failing the selected-attempt display.

**Status:** CONFIRMED. **Fallback:** Selected attempt can be replaced visually by the global latest result after detail failure.

### 12.4 Feedback page

**Route:** `/student/feedback`.

**File:** `src/pages/student/FeedbackPage.tsx`.

Its flow is similar to ResultDashboard:

```text
fetchStudentAttempts(student ID)
  -> select stored attempt ID
  -> fetchAttemptById(attempt ID)
  -> use result.feedbackSummary
```

It does not need to call `/api/feedback/latest` for the normal selected-attempt path. `fetchLatestFeedback()` exists in `src/services/api.ts` but is not the main retrieval path here.

**Status:** CONFIRMED. Feedback is generated by `storage.build_feedback_summary()` from stored strengths, missing points, categories, and answer feedback.

## 13. Complete Confirmed Student Attempt Trace

The following is the complete normal localStorage-bank path for one student attempt.

```text
1. run_ai_viva.bat
   File: run_ai_viva.bat
   Action: starts services
   Ports: 8010, 8001, 8002, 8000, 5173

2. Browser opens UI
   File: src/main.tsx
   Action: createRoot(...).render(<StrictMode><App /></StrictMode>)
   Port: 5173

3. App initializes
   File: src/App.tsx
   Action: AuthProvider + BrowserRouter + Student routes

4. Student identity initializes
   File: src/contexts/AuthContext.tsx -> AuthProvider
   Storage: viva_session_student/viva_session or DEFAULT_STUDENT
   Backend: none

5. Question bank initializes
   File: src/services/questionBank.ts -> getBankQuestions()
   Storage: viva_question_bank
   Action: seeds INITIAL_BANK_QUESTIONS if missing

6. Student selects session
   File: src/pages/student/StudentDashboard.tsx -> startExam()
   Storage: selected_viva_subject, selected_viva_title
   Backend: none

7. Viva screen loads questions
   File: src/pages/student/VivaExamination.tsx -> loadBankQuestions()
   Function chain: getQuestionsForSubject -> getActiveBankQuestions -> getBankQuestions
   Storage: viva_question_bank, selected_viva_subject
   Backend: skipped when bank is non-empty

8. Question is spoken
   File: src/hooks/useSpeechQuestion.ts
   Action: browser speech synthesis
   Backend/Python speech: none

9. Student starts answer
   File: VivaExamination.tsx -> handleStartRecording()
   Actions: simulated recorder state; browser SpeechRecognition start
   File: src/hooks/useVoiceRecorder.ts -> setState("recording")
   File: src/hooks/useSpeechRecognition.ts -> recognition.start()
   Audio file: none

10. Browser transcribes answer
    File: useSpeechRecognition.ts -> recognition.onresult
    Action: final/interim text into transcript state
    Language: en-US
    Confidence: not captured

11. Transcript enters answer state
    File: VivaExamination.tsx transcript effect
    Storage: React answers object keyed by question ID
    Optional override: textarea writes same object

12. Student submits final examination
    File: VivaExamination.tsx -> handleFinalSubmit()
    Client function: src/services/api.ts -> submitAttempt()
    Storage: none yet; writes last attempt ID only after response

13. Browser sends attempt
    Endpoint: POST /api/attempts
    Browser destination: 127.0.0.1:8000

14. Proxy forwards attempt
    File: proxy_server.py -> proxy()
    Endpoint: POST http://127.0.0.1:8010/api/attempts
    Port: 8010

15. Result handler parses request
    File: result_storage_module/server.py -> VivaApiHandler.do_POST()
    Function: save_attempt(payload)

16. Result normalizes each answer
    File: result_storage_module/storage.py -> save_attempt()
    Reference answer: local bank expectedAnswer when provided

17. Validation request
    File: storage.py -> validate_answer()
    Endpoint: POST http://127.0.0.1:8002/api/v1/validate
    Validation handler: app/api/v1/validation.py -> validate_student_answer()
    Service: heavy ValidationService or import fallback LightweightValidationService

18. Validation returns or falls back
    Primary DB/storage: none
    Failure fallback: storage.local_validate_answer()
    Result stored in answer.validation JSON

19. Evaluation request
    File: storage.py -> evaluate_answer()
    Endpoint: POST http://127.0.0.1:8002/api/v1/evaluate
    Actual route: absent in inspected validation router
    Result: HTTP 404 -> urllib HTTPError/URLError catch

20. Local evaluation fallback
    File: storage.py -> local_evaluate_answer()
    Action: keyword coverage -> score/verdict/feedback
    Post-processing: non-empty 2+ word answers raised to minimum score 5 if needed

21. Attempt total calculated
    File: storage.py -> save_attempt()
    Values: attempted, total_score, max_score, percentage, grade

22. Attempt saved
    File: storage.py -> save_attempt()
    Database: result_storage_module/viva_history.db
    Tables: viva_attempts, viva_answers

23. Result returned
    File: storage.py -> get_attempt() -> format_attempt()
    Transport: result API -> proxy -> browser
    HTTP: 201 {result: ...}

24. Browser stores completed ID
    File: VivaExamination.tsx -> handleFinalSubmit()
    Storage: viva_last_completed_attempt_id

25. Completion page loads latest
    File: VivaCompletion.tsx -> fetchLatestResult()
    Endpoint: GET :8000/api/results/latest -> :8010/api/results/latest
    Database: newest row in viva_attempts

26. Results page lists student attempts
    File: ResultDashboard.tsx -> fetchStudentAttempts()
    Endpoint: GET :8000/api/attempts/student/{studentId} -> :8010
    Database: rows from viva_attempts for supplied ID

27. Results page loads selected detail
    File: ResultDashboard.tsx -> fetchAttemptById()
    Endpoint: GET :8000/api/attempts/{attemptId} -> :8010
    Database: parent viva_attempts + child viva_answers

28. Student sees result
    File: ResultDashboard.tsx
    Display: formatted result, score metrics, sections, answers, feedback

29. Feedback page loads same stored detail
    File: FeedbackPage.tsx
    Endpoint: same attempt list/detail endpoints
    Display source: result.feedbackSummary
```

## 14. Disconnected, Simulated, Fallback, and Broken Components

| Component/path | Classification | Exact evidence |
|---|---|---|
| `Viva-speech-Module-main/.../viva_speech.py` | DISCONNECTED | Launcher runs only `setup_db.py`; browser uses Web Speech API; no HTTP speech endpoint exists |
| `Viva-speech-Module-main/.../viva.db` | DISCONNECTED | Used by standalone speech CLI, not `result_storage_module/storage.py` |
| `AI_viva_evalution_module-main/.../evaluator.py` | DISCONNECTED | Manual OpenAI batch evaluator is not called by launcher or active result API |
| `useVoiceRecorder.ts` | SIMULATED | `startRecording()` only calls `setState("recording")`; comment says real MediaRecorder is future work |
| Camera/proctoring | SIMULATED/LOCAL-ONLY | `getUserMedia({video:true})` attaches to local video; no upload/stream endpoint |
| Live faculty monitoring | SIMULATED/LOCAL-ONLY | `viva_active_session` and `viva_suspicious_flag` use browser localStorage polling |
| `/api/v1/evaluate` | BROKEN/MISMATCHED | Result storage posts to it; validation router exposes only `/api/v1/validate` |
| `evaluate_answer()` remote branch | FALLBACK-BASED | 404 is caught as `URLError`; local keyword evaluation runs |
| Heavy NLP models | ENVIRONMENT-DEPENDENT | Import/model availability determines whether heavy service can execute |
| Validation local fallback | FALLBACK-BASED | `storage.validate_answer()` catches URL/timeout/JSON errors and token-matches locally |
| Completion navigation after submit error | MISLEADING/FALLBACK | `handleFinalSubmit()` navigates to completion after one second even if save failed |
| Completion result lookup | GLOBAL LATEST | `VivaCompletion.tsx` calls `/api/results/latest`, not the saved attempt-ID endpoint |
| Result detail fallback | FALLBACK | ResultDashboard/FeedbackPage use global latest when selected detail fails |
| Question API in normal viva | BYPASSED | Local question bank exists by default, so `fetchQuestions()` is not reached |
| Backend/demo expected answers | BROKEN/MISMATCHED DATA FLOW | Omitted frontend expectedAnswer causes storage to use question text as expected answer |
| Frontend authentication | SIMULATED/UNPROTECTED | AuthContext localStorage/default users; no backend student/faculty login |

## 15. Verified Runtime Conclusions

1. Running `run_ai_viva.bat` opens five service processes/windows, plus a setup command that initializes the standalone speech database.
2. The React UI is served by Vite on port 5173 and enters through `src/main.tsx`.
3. The normal student viva obtains questions from browser localStorage, not the Question API.
4. The active browser answer is text from Web Speech API; no audio recording is sent to any backend.
5. The Python speech module is not part of the active browser runtime.
6. The browser submits one JSON attempt to the proxy on port 8000.
7. The proxy forwards `/api/attempts` to the result API on port 8010.
8. The result API directly calls validation on port 8002 at `/api/v1/validate`.
9. The result API also calls `/api/v1/evaluate`, but the inspected validation API has no such route; the request falls back to local keyword scoring.
10. Active attempts are stored in `result_storage_module/viva_history.db`, not in `viva.db` or `evaluation_results.db`.
11. The student results page uses the supplied localStorage/default student ID to request attempt summaries, then fetches full attempt detail by attempt ID.
12. Result endpoints have no backend authentication or ownership check, so the runtime path is functionally connected but not access-controlled.
13. The completion screen can appear after a failed save and can display the globally latest result or placeholders, so “completion displayed” does not prove that the current attempt was stored.

## 16. Runtime Verification Checklist

| Check | Source-confirmed result |
|---|---|
| Launcher command | `run_ai_viva.bat` starts result, question, validation, proxy, and UI processes |
| UI port | 5173 |
| Proxy port | 8000 |
| Result API port | 8010 |
| Validation API port | 8002 |
| Question API port | 8001 |
| Active question storage | `localStorage.viva_question_bank` by default |
| Active transcript source | Browser Web Speech API, `en-US` |
| Actual audio upload | None |
| Active validation endpoint | `POST /api/v1/validate` on 8002 |
| Active evaluation endpoint | Caller uses `/api/v1/evaluate`; route absent in inspected validation API |
| Active result database | `result_storage_module/viva_history.db` |
| Result parent table | `viva_attempts` |
| Result child table | `viva_answers` |
| Student attempt list endpoint | `GET /api/attempts/student/{studentId}` |
| Student detail endpoint | `GET /api/attempts/{attemptId}` |
| Student authentication | LocalStorage/default user only |
| Python speech integration | Disconnected from active browser flow |
| OpenAI evaluator integration | Disconnected from active browser flow |

---

**Bottom line:** The repository's actual browser runtime is a localStorage-backed React demo connected to a result-storage API and a validation API. Browser speech recognition supplies text, not audio. Evaluation currently depends on a broken `/evaluate` contract and therefore normally falls back to local keyword scoring. The Python speech and standalone OpenAI evaluation modules remain separate, manual pipelines.
