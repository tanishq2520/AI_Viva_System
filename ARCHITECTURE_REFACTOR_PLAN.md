# AI Viva System Architecture Refactor Plan

**Planning date:** 2026-09-12  
**Status:** Proposal only. No source code, database, dependency, or configuration changes were made while creating this plan.  
**Basis:** `PROJECT_ARCHITECTURE_REPORT.md`, `RUNTIME_FLOW_ANALYSIS.md`, and `TEACHER_FLOW_ANALYSIS.md`, verified against the existing repository source.

## A. Current Architecture Summary

The current repository is a partially integrated collection of independently developed systems:

```text
React/Vite UI :5173
  -> proxy_server.py :8000
  -> result_storage_module/server.py :8010
       -> direct HTTP validation call :8002
       -> viva_history.db

Question API :8001
  -> SQLAlchemy database
  -> teacher JWT and file parsing

Validation API :8002
  -> /api/v1/validate
  -> heavyweight or lightweight NLP paths

Standalone speech CLI
  -> viva.db
  -> Edge TTS, PyAudio, VAD, Whisper

Standalone evaluation CLI
  -> OpenAI
  -> evaluation_results.db
```

### Current active browser path

The path that actually serves the normal demo is:

```text
run_ai_viva.bat
  -> Vite UI
  -> localStorage-backed identity and question bank
  -> browser Web Speech API transcript
  -> proxy
  -> result storage API
  -> validation API /validate
  -> broken /evaluate request
  -> local keyword evaluation fallback
  -> result_storage_module/viva_history.db
  -> result/result detail screens
```

### Current source-of-truth problems

There are multiple competing sources of truth:

- localStorage users and sessions;
- localStorage question bank and active/draft status;
- Question API `teachers`, `question_sets`, and `questions` database;
- result API hardcoded `DEMO_QUESTIONS`;
- speech module `viva.db`;
- standalone evaluation `evaluation_results.db`;
- frontend demo question constants;
- model-based validation and local fallback evaluation.

### Current verified limitations

- Normal faculty login and registration are localStorage simulations.
- Faculty question CRUD is localStorage-only.
- Faculty import calls a real parser but saves parsed questions only to localStorage.
- The authenticated Question API upload path writes a database but is disconnected from student availability.
- “Active” is a browser filter, not backend publishing.
- Student result APIs have no ownership checks.
- Faculty result APIs have no role checks.
- Browser voice capture produces text but `useVoiceRecorder` does not record audio.
- Python speech is a disconnected CLI, not a service.
- `/api/v1/evaluate` is called but not implemented in the inspected validation router.
- Reports called PDF/XLSX are text or in-memory simulations.
- Live monitoring is same-browser localStorage polling.
- Analytics contain hardcoded preview values when data is absent.
- Startup opens several independently managed windows and has no readiness checks.

## B. Problems With the Current Architecture

### B.1 Structural problems

| Problem | Evidence | Impact |
|---|---|---|
| Too many runtimes | UI, proxy, result API, Question API, validation API, speech CLI, evaluation CLI | Startup/debugging is difficult and service ownership is unclear |
| Proxy indirection | `proxy_server.py` routes several unrelated service contracts | More failure points and no meaningful domain boundary |
| Mixed frameworks | FastAPI services plus Python `http.server` result API | Inconsistent validation, auth, error, and typing behavior |
| Split question systems | localStorage bank, Question API DB, hardcoded demo bank, speech DB | Teachers and students can use different questions |
| Split result systems | `viva_history.db` and standalone `evaluation_results.db` | Results can be stored in incompatible formats |
| Split speech systems | browser Web Speech and Python Whisper CLI | No single transcript contract or lifecycle |
| UI owns domain behavior | localStorage decides identity, publication, sessions, and exam settings | Security and consistency cannot be enforced server-side |

### B.2 Correctness problems

- The result API evaluates against `questionText` when the expected answer is absent instead of resolving a canonical question answer.
- The active evaluation route is mismatched: `/api/v1/evaluate` is called but not registered in the inspected validation API.
- Non-empty answers can be raised to a minimum score after local evaluation, weakening score semantics.
- Five displayed score dimensions are derived from one overall percentage rather than independently evaluated.
- Completion can be shown after a failed submission.
- Completion uses the globally latest attempt rather than reliably loading the submitted attempt ID.
- Student detail retrieval falls back to the globally latest result if a selected attempt fails.
- Backend-uploaded question sets are not available to the active student flow.
- Attempt submission has no idempotency key or duplicate-submission guard.
- No server-side attempt state prevents edits after final submission.

### B.3 Security problems

- Any visitor can enter the normal faculty portal through mock login behavior.
- Any visitor can enter the normal student portal through default identity behavior.
- Route access is not protected by role.
- Result APIs have no authentication or authorization.
- A student can alter a student ID or attempt ID in a request.
- Wildcard CORS is enabled.
- Default/predictable Question API secrets are generated by the launcher.
- Admin upload contains default credentials in frontend code/state.
- Public file parsing is intentionally unauthenticated and lacks a clear abuse policy.

### B.4 Operational problems

- `run_ai_viva.bat` launches five windows and does not wait for readiness.
- A service can fail after `start` while the launcher still appears successful.
- Heavy validation model loading can be slow or fail at import/request time.
- Database concurrency and migration strategy are undefined.
- No structured application logging or request correlation exists across services.
- There is no single health endpoint representing the application as a whole.

## C. Target Architecture

### C.1 Architectural decision

Adopt a **modular monolith**:

```text
One backend process
  - authentication and authorization
  - users and roles
  - questions and imports
  - vivas and publishing
  - attempts and answers
  - speech orchestration contract
  - validation
  - evaluation
  - results and reports
  - health/readiness

One server-side database

One React frontend
```

The browser and backend may still run as two processes in development, but the user-facing application has one backend and one frontend. There will be no runtime proxy and no independently managed Question/Result/Validation servers.

### C.2 Target runtime

```text
One command
  -> starts the modular backend
  -> starts the frontend or serves its production assets
  -> waits for backend readiness
  -> opens the browser
```

Preferred production shape:

```text
Browser
  -> one origin
       /          React application
       /api/*     modular monolith API
       /health    liveness/readiness
```

Preferred development shape if separate Vite dev mode is retained:

```text
One launcher
  -> backend :8000
  -> Vite :5173 with one controlled dev proxy
  -> readiness check
  -> browser opens only after both are ready
```

The Vite development server and backend are development processes, not independently exposed product services. The existing Python proxy should be removed from the runtime path.

### C.3 Target module boundaries

The backend should be one deployable application with internal modules:

```text
app/
  auth/
  users/
  questions/
  imports/
  vivas/
  attempts/
  evaluation/
  speech/
  reports/
  health/
  db/
  common/
```

Each module may have routers, schemas, services, repositories, and tests, but all modules share one application configuration, one authentication mechanism, one database session strategy, and one error format.

### C.4 Source-of-truth rule

The server owns all authoritative state:

- users and roles;
- question records and expected answers;
- vivas and publication state;
- viva-question ordering and configuration;
- student availability;
- attempts and submission state;
- answer transcripts;
- validation/evaluation state;
- scores and feedback;
- report metadata.

The browser may cache UI state for convenience, but localStorage must never decide authorization, question publication, result ownership, or final scores.

## D. Target End-to-End Teacher Flow

### D.1 Teacher authentication

```text
Teacher opens application
  -> /teacher/login
  -> POST /api/auth/login
  -> backend verifies password hash
  -> backend returns secure session or access/refresh token
  -> frontend stores only the approved session mechanism
  -> GET /api/auth/me
  -> protected teacher routes render
```

Recommended initial implementation for a local/small-team system:

- short-lived access token;
- refresh token in an HttpOnly, Secure, SameSite cookie if using cookie sessions;
- password hashes using a maintained password hashing library;
- no password in localStorage;
- no default fallback users;
- no frontend-only registration success.

### D.2 Dashboard

```text
GET /api/teacher/dashboard
  -> counts owned questions and vivas
  -> counts published/upcoming/completed vivas
  -> summarizes attempts and average scores
```

All values come from the server. Empty-state values must be zero or “No data,” never fabricated sample metrics.

### D.3 Create/edit/delete questions

```text
Teacher -> Question form
  -> POST /api/questions
  -> question row owned by authenticated teacher

Teacher -> Edit
  -> PATCH /api/questions/{question_id}

Teacher -> Delete/archive
  -> DELETE /api/questions/{question_id}
```

Rules:

- question text and expected answer are required;
- subject/category are normalized server-side;
- teacher ownership is checked on every mutation;
- hard deletion should be avoided once a question is used by an attempt; archive instead;
- question IDs are server-generated UUIDs or database IDs;
- expected answers are never sent in student-facing question endpoints.

### D.4 Import questions

```text
Teacher selects file
  -> POST /api/questions/import/preview
  -> backend parser extracts candidate pairs
  -> preview response includes row-level errors
  -> teacher edits/removes invalid rows
  -> POST /api/questions/import/commit
  -> backend transaction creates owned question records
```

The preview must not publish or create permanent questions. Commit must be explicit and transactional.

### D.5 Create a viva

```text
POST /api/vivas
  -> create draft Viva
  -> select existing owned Questions
  -> configure duration, instructions, language, answer policy
  -> set ordering and optional per-question time limits
```

The viva must reference questions through a join table so the same question can be reused while preserving the question text/answer version used by a published viva.

### D.6 Draft, preview, publish

```text
Draft
  -> teacher edits configuration and selected questions
  -> GET /api/vivas/{id}/preview

Publish
  -> POST /api/vivas/{id}/publish
  -> backend validates all required fields
  -> transaction sets status = published
  -> stores published_at and version
  -> creates availability/assignment records
```

Publishing is a server-side state transition. A published viva should be immutable for active attempts. Later edits create a new draft/version or are prohibited while attempts exist.

### D.7 Make available to students

Choose one simple first-release policy:

- publish to all active students in a selected course/department; or
- explicitly assign to selected students.

The server creates assignment/availability rows. Student dashboard calls:

```text
GET /api/vivas/available
```

and receives only vivas assigned to the authenticated student whose availability window is open.

### D.8 View attempts

```text
GET /api/teacher/attempts?viva_id=&student_id=&status=&page=&search=
```

The backend applies ownership and filters. Pagination is server-side.

### D.9 View individual result

```text
GET /api/teacher/attempts/{attempt_id}
```

The response includes:

- student identity permitted for the teacher;
- viva metadata;
- submission timestamps and status;
- each ordered question;
- submitted transcript/edited answer;
- expected answer according to teacher permissions;
- validation status and confidence;
- score and feedback;
- total score and rubric breakdown.

### D.10 Feedback and report export

Feedback is stored as part of answer evaluation and can optionally include teacher comments:

```text
POST /api/teacher/attempts/{attempt_id}/feedback
```

Real report generation:

```text
GET /api/teacher/attempts/{attempt_id}/report?format=pdf
GET /api/teacher/vivas/{viva_id}/report?format=csv
```

The backend generates the file from the authoritative attempt data. The UI must not claim PDF/XLSX while creating a text Blob.

## E. Target End-to-End Student Flow

```text
Student Login
  -> Student Dashboard
  -> GET /api/vivas/available
  -> Viva Instructions
  -> POST /api/vivas/{id}/attempts
  -> server creates one in-progress Attempt
  -> GET /api/attempts/{attempt_id}/questions
  -> question displayed without expected answer
  -> browser speech recognition produces transcript
  -> student edits or re-records
  -> POST /api/attempts/{attempt_id}/answers/{viva_question_id}
  -> answer remains draft
  -> student confirms each answer
  -> GET /api/attempts/{attempt_id}/review
  -> student reviews all answers
  -> POST /api/attempts/{attempt_id}/submit
  -> server atomically locks submission
  -> evaluation pipeline runs
  -> result becomes available
  -> GET /api/student/attempts/{attempt_id}
  -> student sees own answers, score, and feedback
```

### E.1 Student answer states

Each answer should have explicit state:

```text
not_started
recording
transcribing
draft
confirmed
submitted
invalid
```

The student must be able to:

- start/re-record speech;
- stop recognition;
- edit transcript text;
- discard and retry;
- confirm the answer;
- move backward before final submission;
- review all answers on a final review screen;
- submit once;
- see submission status while evaluation runs.

### E.2 Submission idempotency

The final submit request must include an idempotency key or use a server-side attempt lock. Repeated clicks, network retries, or browser refreshes must not create duplicate attempts.

### E.3 Student access rules

All student result routes derive the student identity from the authenticated principal, not from a caller-provided student ID:

```text
GET /api/student/attempts
GET /api/student/attempts/{attempt_id}
```

The backend verifies that the attempt belongs to the authenticated student.

## F. Speech Architecture Recommendation

Two approaches were inspected and compared.

### F.1 Browser Web Speech API

**Existing implementation:** `useSpeechRecognition.ts`.

| Criterion | Assessment |
|---|---|
| Reliability | Good for supported Chromium environments; inconsistent across browsers and OS versions |
| Installation complexity | Very low; no Python audio/model setup |
| CPU/GPU requirements | Browser/provider-managed; minimal local project CPU/GPU burden |
| Latency | Usually low for live interim/final transcript |
| Browser compatibility | Not universal; feature detection is required |
| Microphone handling | Browser permission model is simple; current implementation needs proper error/retry UX |
| English/Hinglish | Can be improved with `en-IN`; exact Hinglish quality requires testing in target browsers |
| Scalability | Speech work is outside the backend in common implementations, so backend scales better |
| Integration | Simple text contract; no audio upload required |
| Maintenance | Low compared with local model packaging |
| Offline/local operation | Weak; browser recognition may depend on browser/network implementation |
| Data control | Audio/transcript behavior depends on browser implementation; privacy disclosure is required |

### F.2 Python PyAudio + Whisper pipeline

**Existing implementation:** `Viva-speech-Module-main/.../viva_speech.py`.

| Criterion | Assessment |
|---|---|
| Reliability | More controllable once installed, but current code is Windows-specific and CLI-only |
| Installation complexity | High: PyAudio, VAD, noise reduction, librosa, Whisper model, audio drivers |
| CPU/GPU requirements | Local faster-Whisper CPU/int8 is possible but model loading and transcription consume resources |
| Latency | Per-answer processing is slower than live browser recognition; model startup is expensive |
| Browser compatibility | None directly; requires backend audio transport or a desktop client |
| Microphone handling | Detailed VAD/noise handling exists, but only in a local Python process |
| English/Hinglish | Current main path forces English; multilingual support would require model/config work |
| Scalability | Centralized transcription becomes CPU/GPU-heavy with simultaneous students |
| Integration | Requires audio upload/streaming, temporary files, job state, and cleanup |
| Maintenance | High; OS/audio/model compatibility burden |
| Offline/local operation | Strongest option; models can run locally after download |
| Data control | Better local control if deployed on trusted hardware |

### F.3 Recommendation

Use **browser speech recognition as the primary speech approach for the first unified architecture**, with an explicit text-transcript contract and graceful typed-answer fallback.

Reasons:

1. The existing active student workflow already produces browser transcripts.
2. The Python pipeline is not a service and is disconnected from the React application.
3. Integrating Whisper correctly would require audio upload/session APIs, model lifecycle management, job processing, storage policy, and higher operational cost.
4. The stated goal is a small-team system that is easy to run and demonstrate.
5. Browser recognition keeps speech processing out of the main backend and avoids a CPU/GPU bottleneck for a first release.

Required improvements to the browser approach:

- feature-detect support and show a clear unsupported-browser path;
- use configurable language, initially `en-IN` or `en-US` based on a tested target browser;
- retain final transcript separately from interim transcript;
- allow edit, retry, and manual typing;
- do not claim audio recording unless `MediaRecorder` is truly implemented;
- document browser/network privacy behavior;
- add transcript length and empty-answer validation;
- add automated tests around answer state transitions.

### F.4 Python speech decision boundary

Do not delete the Python speech module during the first migration phase. Quarantine it as an optional offline/experimental adapter. Remove it from the launcher and active product documentation. Reconsider integration only after a measured requirement appears, such as:

- offline operation is mandatory;
- browser recognition fails target-language accuracy tests;
- raw audio retention is explicitly required;
- a controlled desktop/device deployment is available;
- CPU/GPU capacity is measured for expected concurrent students.

## G. Validation and Evaluation Recommendation

### G.1 One backend-owned pipeline

The UI must call only high-level domain endpoints. It must never know `/validate`, `/evaluate`, model names, or fallback rules.

Recommended internal service flow:

```text
AttemptService.submit_attempt()
  -> AnswerService.lock_and_collect_answers()
  -> EvaluationService.evaluate_attempt()
       -> TranscriptQualityValidator
       -> AnswerScorer
       -> FeedbackGenerator
  -> ResultRepository.save_evaluation()
```

The external API exposes only:

```text
POST /api/attempts/{attempt_id}/submit
GET  /api/student/attempts/{attempt_id}
GET  /api/teacher/attempts/{attempt_id}
```

### G.2 Separate validation and evaluation internally, one public operation

Keep validation and evaluation as separate internal functions because they answer different questions:

- **Validation:** Is the transcript usable/relevant enough to evaluate?
- **Evaluation:** Given the question, reference answer, and usable response, what score and feedback should be produced?

But expose one orchestration operation to the UI:

```text
EvaluationService.evaluate_answer(question, expected_answer, transcript)
```

The service returns a single versioned result:

```json
{
  "status": "evaluated",
  "validation": {
    "status": "valid",
    "confidence": 0.84,
    "remarks": "..."
  },
  "evaluation": {
    "score": 8,
    "max_score": 10,
    "verdict": "partially_correct",
    "strengths": ["..."],
    "missing_points": ["..."],
    "feedback": "..."
  },
  "evaluator_version": "rubric-v1"
}
```

### G.3 Choose one scoring engine

For the first reliable release:

1. Use one deterministic, testable scoring implementation behind `EvaluationService`.
2. Prefer semantic similarity plus explicit concept coverage if the heavy model is available and benchmarked.
3. Otherwise use a clearly documented keyword/concept rubric, not a hidden fallback.
4. Remove the post-hoc “minimum score for two words” rule.
5. Do not silently change scoring engines when a model is unavailable. Mark an attempt as `evaluation_failed` or use an explicitly configured fallback policy visible to teachers.
6. Store evaluator version and method with each answer.

The existing OpenAI evaluator, Gemini path, local LLM paths, and result-storage `/evaluate` attempt should not coexist as independent production graders.

### G.4 Recommended first-release evaluation policy

Use a deterministic rubric with:

- transcript quality gate;
- expected-concept coverage;
- semantic similarity only if the selected model is available and tested;
- score 0-10;
- explicit unanswered/invalid states;
- stable thresholds stored in configuration;
- test fixtures for correct, partial, irrelevant, empty, noisy, and Hinglish answers.

Add an LLM evaluator only as a versioned, opt-in provider after establishing an evaluation test set and review process.

### G.5 Remove the route mismatch

The new modular backend must have no internal HTTP call from result storage to validation. The missing `/api/v1/evaluate` problem disappears because evaluation is a direct service call within one process.

## H. Database Schema

Use one authoritative relational database. Recommended development default: SQLite with WAL mode for local demos. Recommended multi-student deployment: PostgreSQL using the same SQLAlchemy/domain schema. The application must not use both existing SQLite databases as independent sources of truth.

### H.1 Core tables

#### `users`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `email` | Unique login identifier |
| `password_hash` | Secure password hash |
| `name` | Display name |
| `role` | `student` or `teacher` or controlled admin role |
| `student_number` | Nullable, unique for students |
| `department` | Ownership/availability metadata |
| `is_active` | Account status |
| `created_at`, `updated_at` | Audit timestamps |

#### `questions`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `owner_id` | Teacher creator/owner |
| `text` | Question text |
| `expected_answer` | Teacher reference answer |
| `subject` | Subject/category grouping |
| `topic` | Topic metadata |
| `difficulty` | Easy/Medium/Hard |
| `language` | Intended language |
| `status` | Active/archived; draft belongs to a viva workflow or question status policy |
| `created_at`, `updated_at` | Audit timestamps |

#### `vivas`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `owner_id` | Teacher owner |
| `title` | Viva title |
| `subject` | Subject |
| `instructions` | Student instructions |
| `duration_seconds` | Overall duration |
| `status` | Draft/Published/Closed/Archived |
| `published_at` | Publication timestamp |
| `available_from`, `available_until` | Availability window |
| `version` | Published configuration version |
| `created_at`, `updated_at` | Audit timestamps |

#### `viva_questions`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `viva_id` | Parent viva |
| `question_id` | Source question |
| `position` | Ordered question number |
| `time_limit_seconds` | Optional per-question limit |
| `question_text_snapshot` | Immutable published text |
| `expected_answer_snapshot` | Immutable evaluation reference snapshot |
| `max_score` | Usually 10 |

Snapshots prevent editing a question later from changing an already published viva or historical evaluation.

#### `viva_assignments`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `viva_id` | Assigned viva |
| `student_id` | Assigned student |
| `status` | Available/Started/Completed/Expired |
| `available_from`, `available_until` | Assignment window |
| `created_at` | Audit timestamp |

A first release may use a course/cohort assignment table instead of individual rows, but the authorization query must still resolve whether a student may start the viva.

#### `attempts`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `viva_id` | Viva being attempted |
| `student_id` | Authenticated student owner |
| `status` | InProgress/Submitted/Evaluating/Completed/Failed/Expired |
| `started_at` | Start time |
| `submitted_at` | Final submission time |
| `completed_at` | Evaluation completion time |
| `duration_seconds` | Measured duration |
| `total_score` | Earned score |
| `max_score` | Maximum score |
| `percentage` | Derived final percentage |
| `grade` | Derived grade |
| `submission_key` | Idempotency/duplicate prevention |
| `evaluator_version` | Grading version |

#### `answers`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `attempt_id` | Parent attempt |
| `viva_question_id` | Ordered viva question |
| `transcript` | Browser transcript |
| `edited_answer` | Student-edited final text, if different |
| `answer_status` | Draft/Confirmed/Submitted/Unanswered |
| `confirmed_at` | Student confirmation time |
| `created_at`, `updated_at` | Audit timestamps |

#### `evaluations`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `answer_id` | Evaluated answer |
| `validation_status` | Valid/Invalid/Unanswered/Error |
| `validation_confidence` | Quality confidence |
| `semantic_similarity` | Optional metric |
| `concept_coverage` | Optional metric |
| `score` | Earned score |
| `max_score` | Maximum answer score |
| `verdict` | Correct/Partial/Incorrect |
| `feedback` | Answer feedback |
| `strengths_json` | Structured strengths |
| `missing_points_json` | Structured missing points |
| `method` | Deterministic/model/provider identifier |
| `version` | Rubric/model version |
| `created_at` | Evaluation timestamp |

#### `teacher_feedback`

Optional table for human comments:

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `attempt_id` or `answer_id` | Scope |
| `teacher_id` | Author |
| `comment` | Human feedback |
| `created_at`, `updated_at` | Audit timestamps |

#### `report_exports`

Optional audit table for generated reports:

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `requested_by` | Teacher/user |
| `attempt_id` or `viva_id` | Report scope |
| `format` | PDF/CSV/XLSX |
| `status` | Queued/Ready/Failed |
| `file_path` or object-storage key | Generated artifact |
| `created_at` | Audit timestamp |

### H.2 Relationships

```text
users (teacher) 1 ---- many questions
users (teacher) 1 ---- many vivas
vivas 1 ---- many viva_questions
questions 1 ---- many viva_questions
vivas 1 ---- many viva_assignments
users (student) 1 ---- many viva_assignments
users (student) 1 ---- many attempts
vivas 1 ---- many attempts
attempts 1 ---- many answers
viva_questions 1 ---- many answers across attempts
answers 1 ---- one or more evaluation revisions
attempts/answers 1 ---- many teacher_feedback rows
```

### H.3 Database consolidation decision

Recommended target:

- Keep the domain data from `question_module.db` and `viva_history.db` only as migration inputs.
- Create one new canonical database schema owned by the modular monolith.
- Migrate teacher records and question sets into `users`, `questions`, `vivas`, and `viva_questions` where their intent is clear.
- Migrate result attempts/answers into `attempts`, `answers`, and `evaluations`.
- Treat `viva.db` and `evaluation_results.db` as disconnected legacy inputs; migrate only if there is verified valuable data.
- Do not merge unrelated speech question rows into production questions without human mapping.
- Preserve original IDs in nullable legacy-ID columns during migration for audit and rollback.

## I. API Design

All endpoints below are external domain APIs. Internal validation/evaluation/speech details are hidden.

### I.1 Authentication

```text
POST   /api/auth/register/student
POST   /api/auth/register/teacher
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

Role and ownership are derived from the authenticated principal, never from a client-supplied role or student ID.

### I.2 Questions

```text
GET    /api/questions?owner=me&subject=&status=&page=
POST   /api/questions
GET    /api/questions/{question_id}
PATCH  /api/questions/{question_id}
DELETE /api/questions/{question_id}
POST   /api/questions/import/preview
POST   /api/questions/import/commit
```

Student-facing question responses must omit expected answers.

### I.3 Vivas

```text
GET    /api/vivas?owner=me&status=
POST   /api/vivas
GET    /api/vivas/{viva_id}
PATCH  /api/vivas/{viva_id}
DELETE /api/vivas/{viva_id}
POST   /api/vivas/{viva_id}/publish
POST   /api/vivas/{viva_id}/close
GET    /api/vivas/{viva_id}/preview
GET    /api/vivas/available
GET    /api/vivas/{viva_id}/student-view
```

Teacher endpoints enforce ownership. Student endpoints enforce assignment and publication state.

### I.4 Attempts and answers

```text
POST   /api/vivas/{viva_id}/attempts
GET    /api/attempts/{attempt_id}
GET    /api/attempts/{attempt_id}/questions
PUT    /api/attempts/{attempt_id}/answers/{viva_question_id}
POST   /api/attempts/{attempt_id}/answers/{viva_question_id}/confirm
GET    /api/attempts/{attempt_id}/review
POST   /api/attempts/{attempt_id}/submit
```

`PUT`/`POST` operations verify that the authenticated student owns the in-progress attempt and that it is not already submitted.

### I.5 Results

```text
GET    /api/student/attempts
GET    /api/student/attempts/{attempt_id}
GET    /api/teacher/attempts
GET    /api/teacher/attempts/{attempt_id}
GET    /api/teacher/attempts/{attempt_id}/report?format=pdf
GET    /api/teacher/vivas/{viva_id}/report?format=csv
```

Students receive only their own attempts. Teachers receive only attempts for their owned vivas or assigned department/cohort policy.

### I.6 Health and readiness

```text
GET /health/live
GET /health/ready
GET /api/version
```

`/health/ready` checks database connectivity and required evaluation configuration/model readiness. It should not trigger expensive model downloads during a health request.

### I.7 API conventions

- Version APIs through `/api/v1` only if a versioning need exists; do not expose internal service paths.
- Return consistent JSON error shape:

```json
{
  "error": {
    "code": "ATTEMPT_ALREADY_SUBMITTED",
    "message": "This attempt is already submitted.",
    "request_id": "..."
  }
}
```

- Validate request bodies with typed schemas.
- Use pagination for lists.
- Use request IDs in logs and responses.
- Use idempotency keys for create-attempt and submit-attempt operations.

## J. Project Folder Structure

Recommended target structure:

```text
Viva_Ai_System/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── common/
│   │   │   ├── errors.py
│   │   │   ├── auth.py
│   │   │   ├── pagination.py
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   ├── models/
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   ├── auth/
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   ├── questions/
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   └── repository.py
│   │   ├── imports/
│   │   │   ├── parser.py
│   │   │   ├── preview.py
│   │   │   └── service.py
│   │   ├── vivas/
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   ├── attempts/
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   ├── evaluation/
│   │   │   ├── service.py
│   │   │   ├── rubric.py
│   │   │   └── providers.py
│   │   ├── speech/
│   │   │   └── contract.py
│   │   ├── reports/
│   │   │   ├── router.py
│   │   │   └── service.py
│   │   └── health/
│   │       └── router.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── auth/
│   │   ├── api/
│   │   ├── teacher/
│   │   ├── student/
│   │   ├── components/
│   │   └── styles/
│   ├── package.json
│   └── .env.example
├── scripts/
│   ├── start.py
│   ├── migrate.py
│   ├── seed_demo.py
│   └── check_ready.py
├── migrations/
├── docs/
│   ├── ARCHITECTURE_REFACTOR_PLAN.md
│   ├── PROJECT_ARCHITECTURE_REPORT.md
│   ├── RUNTIME_FLOW_ANALYSIS.md
│   └── TEACHER_FLOW_ANALYSIS.md
├── data/
│   └── legacy/            # read-only migration inputs during transition
└── start_ai_viva.bat
```

A production build can serve the frontend from the backend or a single reverse proxy, but the application must expose one product origin and one backend API boundary.

## K. Components/Modules to Keep

### K.1 Keep and adapt

| Current component | Target action | Reason |
|---|---|---|
| React UI pages/components | Keep visual foundation; replace data/auth flows | Existing screens provide useful UX starting points |
| `Viva_UI_Module-main/src/pages/student/VivaExamination.tsx` | Rewrite around server-backed attempts and answer states | Student workflow exists but is local/unsafe |
| `Viva_UI_Module-main/src/pages/faculty/QuestionBank.tsx` | Rewrite to call `/api/questions` and viva endpoints | Existing form concepts map well to target workflow |
| `Viva_UI_Module-main/src/pages/faculty/ReportsPage.tsx` | Keep layout; replace APIs and real export implementation | Existing detail view is useful |
| `Viva_UI_Module-main/src/pages/faculty/AnalyticsDashboard.tsx` | Keep charts; remove fabricated fallback metrics | Visualization can consume real aggregate APIs |
| `useSpeechRecognition.ts` | Adapt as primary speech adapter | Lowest integration/operations burden for current project |
| Question parser logic | Move into modular backend imports module | Existing format support is useful |
| Validation text processing | Reuse selectively behind EvaluationService | Existing cleaning and quality heuristics contain useful logic |
| SQLAlchemy models/patterns | Reuse concepts, not schema unchanged | Existing Question API provides a foundation for unified persistence |
| Result formatting concepts | Replace with typed result service/DTOs | Existing fields map to target results |
| Validation tests/text tests | Keep and expand | Useful regression foundation |

### K.2 Keep as migration utilities only

- `result_storage_module/storage.py` scoring/database code: keep temporarily to read/export legacy data, then retire.
- `ai_viva_question_module-main/.../database.py`: use as migration reference; replace with unified models.
- `AI_viva_evalution_module-main/question_bank.py`: use only if verified legacy data must be imported.
- Existing SQLite files: freeze backups and migrate copies, never mutate originals during initial migration.

## L. Components/Modules to Remove or Quarantine

### L.1 Remove from active runtime after migration

| Component | Decision | Reason |
|---|---|---|
| `proxy_server.py` | Remove from product runtime | Modular backend replaces routing proxy |
| `result_storage_module/server.py` | Replace with modular backend attempt/result routes | Inconsistent `http.server`, no auth, embedded scoring |
| `result_storage_module/storage.py` | Split/migrate, then retire | Mixes DB, HTTP calls, scoring, formatting, and fallback behavior |
| `AuthContext` localStorage auth behavior | Replace | Not authentication or authorization |
| `questionBank.ts` localStorage authority | Replace with API client/cache | Cannot publish across browsers |
| `viva_active_session`/flag localStorage monitoring | Remove from core workflow | Not real monitoring or secure proctoring |
| fake custom report generation | Remove | Produces non-persistent fabricated records |
| text Blob “PDF” download | Remove | Mislabels output and is not a report generator |
| hardcoded analytics fallbacks | Remove from production screens | Empty data must not appear as real results |
| `/api/v1/evaluate` call | Remove | Internal route mismatch disappears under service orchestration |

### L.2 Quarantine or remove after explicit decision

| Component | Initial decision | Revisit condition |
|---|---|---|
| `Viva-speech-Module-main` | Quarantine as optional offline adapter | Integrate only after offline/language/raw-audio requirement is proven |
| `AI_viva_evalution_module-main` | Quarantine legacy evaluator | Reuse only after formal provider benchmark and contract review |
| `viva.db` | Legacy migration input, then archive | Keep only if verified speech records are required |
| `evaluation_results.db` | Legacy migration input, then archive | Keep only if verified evaluated records are required |
| standalone recorder utilities | Developer tools only | Remove when no longer used for manual testing |

### L.3 Do not delete during planning/migration

No files should be deleted in this planning phase. Deletion occurs only after:

- replacement behavior is live;
- migration is verified;
- backups exist;
- references are removed;
- rollback window has passed.

## M. Migration Phases

The migration must be incremental. Each phase has a working checkpoint and rollback plan.

### Phase 0: Freeze and baseline

**Changes:**

- Declare current runtime a legacy demo.
- Record current API/database schemas and sample flows.
- Back up all SQLite files.
- Create a test dataset covering one teacher, multiple students, one viva, multiple attempts, empty answers, and evaluation failures.
- Add no behavior changes yet.

**Remains working:** Current launcher and browser demo.

**Test:** Existing validation tests, manual launcher smoke test, current submit/result flow.

**Rollback:** No application rollback required; restore from backups if any tooling touches data.

### Phase 1: Introduce modular backend shell

**Changes:**

- Create new backend application with one process and `/health/live`, `/health/ready`.
- Add central configuration and structured errors/logging.
- Add database session layer and migration framework.
- Keep existing services running in parallel for comparison.

**Remains working:** Legacy UI and services.

**Test:** Backend startup, health checks, DB connection, API error shape.

**Rollback:** Stop the new backend; legacy launcher remains available.

### Phase 2: Unified identity and authorization

**Changes:**

- Add `users` schema and password hashing.
- Implement teacher/student login, logout, current-user, role dependencies.
- Add frontend auth client and protected route wrapper.
- Stop using localStorage users/sessions as authority.

**Remains working:** Legacy question/result behavior can temporarily run behind compatibility routes if needed.

**Test:** Login success/failure, expired sessions, role matrix, direct URL protection, cross-user access denial.

**Rollback:** Feature-flag the new auth client while retaining legacy login only in a development branch; do not expose legacy auth in production.

### Phase 3: Unified questions and imports

**Changes:**

- Migrate Question API teacher/question data into unified tables.
- Implement server-backed question CRUD.
- Move parsers into backend import preview/commit workflow.
- Add explicit validation of file size, format, row errors, and import transaction.
- Replace localStorage Question Bank writes with API calls.

**Remains working:** Student can still use a compatibility endpoint that reads migrated server questions.

**Test:** CRUD ownership, import preview, commit rollback, duplicate handling, expected-answer confidentiality.

**Rollback:** Keep old DB backup and compatibility read endpoint; revert frontend API base to legacy only during controlled rollback.

### Phase 4: Vivas, publishing, and availability

**Changes:**

- Add `vivas`, `viva_questions`, and assignment/availability tables.
- Implement draft/preview/publish/close transitions.
- Snapshot question content on publish.
- Replace localStorage subject/title selection with `/api/vivas/available`.

**Remains working:** Existing student UI can be adapted to consume the new student-view endpoint before full redesign.

**Test:** Draft cannot start, published viva visible to assigned student, closed viva cannot start, cross-teacher ownership denied, publish version immutable.

**Rollback:** Keep migrated legacy questions read-only; unpublished new vivas can be discarded without affecting legacy results.

### Phase 5: Unified attempt lifecycle and review

**Changes:**

- Add server-created in-progress attempts.
- Add per-answer save/confirm endpoints.
- Add review endpoint and final submission lock.
- Add idempotency keys and duplicate-submit protection.
- Remove client-provided authority for student ID, subject, question set, and expected answers.

**Remains working:** Existing result records remain read-only through a compatibility adapter.

**Test:** Refresh/reconnect during attempt, edit/re-record, review completeness, duplicate clicks, expired attempts, unauthorized attempt access.

**Rollback:** Preserve legacy submit route read-only or disabled behind an explicit development flag; do not mix new attempts with old scoring semantics.

### Phase 6: One evaluation pipeline

**Changes:**

- Move validation/evaluation into backend `EvaluationService`.
- Remove direct HTTP calls from result storage.
- Define one rubric, provider, version, and failure policy.
- Store validation/evaluation records with every answer.
- Decide whether heavy models are enabled in the deployment profile.

**Remains working:** Submission can show `Evaluating` and `Evaluation failed` states rather than silently changing scoring paths.

**Test:** Correct/partial/irrelevant/empty/noisy answers, deterministic repeatability, model unavailable behavior, timeout behavior, evaluator version persistence.

**Rollback:** Keep the old result records untouched; disable new submission route if evaluation quality gate fails.

### Phase 7: Results, feedback, and real exports

**Changes:**

- Add authenticated teacher/student result endpoints.
- Add server-side filtering/pagination.
- Add report generation service with real PDF first; add CSV before XLSX if spreadsheet export is needed.
- Remove fake reports and sample analytics.
- Add optional teacher feedback.

**Remains working:** Result details can be read from migrated legacy attempts through a normalized adapter.

**Test:** Report content, access controls, large result, special characters, missing answers, export cleanup, browser download.

**Rollback:** Keep the previous detail view until export output is validated; never overwrite source attempts.

### Phase 8: Cutover and retirement

**Changes:**

- Switch launcher to one backend + frontend.
- Remove proxy and legacy service startup.
- Remove localStorage authority.
- Quarantine speech/evaluation legacy modules.
- Archive legacy databases read-only.
- Update README and operational docs.

**Remains working:** New target architecture only; legacy run command remains in an archive/developer document for rollback during a fixed window.

**Test:** Clean-machine one-command startup, teacher/student end-to-end flow, migration verification, security tests, load smoke test.

**Rollback:** Restore previous launcher and database backups within the defined rollback window; do not attempt bidirectional live writes between old and new schemas.

## N. Testing Strategy

### N.1 Backend unit tests

- Password hashing and verification.
- Role/ownership dependencies.
- Question CRUD and archive rules.
- Import parser per supported file type.
- Import row validation and transactional commit.
- Viva state machine: draft, published, closed.
- Assignment availability rules.
- Attempt state transitions.
- Idempotent submission.
- Evaluation rubric and score boundaries.
- Feedback construction.
- Report data selection.

### N.2 Backend integration tests

- Login -> authenticated request.
- Teacher creates question -> creates viva -> publishes -> student sees viva.
- Student starts attempt -> saves/edits/confirms answers -> reviews -> submits.
- Submission -> evaluation -> result persistence.
- Student can only read own attempts.
- Teacher can only read attempts for owned/authorized vivas.
- Published question snapshots remain stable after source question edit.
- Failed evaluation produces explicit status, not an unannounced alternate grade.

### N.3 Frontend tests

- Protected route behavior by role.
- Teacher question form and server error handling.
- Import preview editing and commit confirmation.
- Draft/preview/publish UI state.
- Student answer edit/re-record/confirm/review flow.
- Submit button disabled after success/in-progress.
- Result selection and no-result states.
- Accessibility and keyboard behavior.

### N.4 End-to-end tests

At minimum:

1. Teacher registers/logs in.
2. Teacher creates two questions.
3. Teacher imports and previews a file.
4. Teacher creates a viva and publishes it.
5. A different browser context logs in as student.
6. Student sees the published viva.
7. Student answers, edits one answer, reviews, and submits.
8. Teacher sees the attempt and full answer details.
9. Student sees only their own result.
10. Real PDF/CSV export contains the submitted data.

### N.5 Security tests

- Student cannot access another student's attempt by changing URL or JSON.
- Student cannot call teacher question CRUD.
- Teacher cannot access another teacher's draft/viva.
- Unauthenticated API calls return 401/403.
- Published student responses omit expected answers.
- CORS permits only configured application origins.
- Rate/size limits are enforced on upload and submission.

### N.6 Performance tests

Measure:

- concurrent student login;
- concurrent viva start;
- concurrent answer saves;
- simultaneous final submissions;
- evaluation queue latency;
- DB lock/wait time;
- report generation time;
- memory consumption of NLP models.

Define initial acceptance targets before implementation, for example:

- ordinary API p95 under 500 ms excluding evaluation;
- answer draft save p95 under 300 ms on local network;
- no duplicate attempts under 100 repeated submit requests;
- controlled evaluation queue behavior under expected concurrency.

## O. Startup and Deployment Strategy

### O.1 One-command development startup

Create one root launcher, preferably:

```text
start_ai_viva.bat
```

The launcher should:

1. Resolve the repository root.
2. Verify Python/Node prerequisites.
3. Verify required environment variables without printing secrets.
4. Initialize/migrate the single database.
5. Start one backend process.
6. Start Vite only in development mode.
7. Poll `/health/ready` until success or timeout.
8. Poll the frontend URL until reachable.
9. Open the browser only after readiness.
10. Trap termination and stop child processes.
11. Write one combined log directory with timestamps and request IDs.

### O.2 Production startup

Prefer one application origin:

```text
python -m backend.app
```

or a production process manager serving the backend and built frontend assets. The final user should not know ports or service order.

### O.3 Database startup

- Run migrations explicitly before serving requests.
- Fail readiness if the schema is incompatible.
- Never silently recreate a production database.
- Use a seed command for demo data rather than hardcoded runtime defaults.
- Use SQLite WAL for local demo mode; use PostgreSQL for multi-student deployment.

### O.4 Health checks

`/health/live` should confirm the process is alive. `/health/ready` should confirm:

- database connection;
- required schema version;
- configured evaluation provider;
- optional model readiness state;
- report output directory availability.

Health checks must be cheap and deterministic.

## P. Security Strategy

### P.1 Identity

- Server-side users are authoritative.
- Passwords are hashed; plaintext passwords never persist.
- Sessions/tokens are rotated and expired.
- No default users in production.
- No credentials in frontend source or generated client bundles.

### P.2 Authorization matrix

| Resource/action | Student | Teacher |
|---|---:|---:|
| Own profile | Read/update limited fields | Read/update own profile |
| Other profiles | No | No unless explicitly authorized |
| Own available vivas | Read | N/A |
| Create/edit questions | No | Own questions only |
| Create/edit/publish vivas | No | Own vivas only |
| Start assigned viva | Yes | No |
| Save own answers | Yes, during own attempt | No |
| Read own results | Yes | No, unless teacher policy permits |
| Read attempts for owned vivas | No | Yes |
| Export owned-viva reports | No | Yes |
| View expected answers | No before submission | Yes |

### P.3 Request security

- Derive `student_id`, `teacher_id`, and role from authenticated context.
- Never trust IDs supplied by the UI for authorization.
- Enforce object ownership in service/repository queries.
- Validate all uploaded file sizes and types server-side.
- Restrict CORS to configured frontend origins.
- Add CSRF protection if cookie authentication is used.
- Add rate limiting to login, upload, and submit endpoints.
- Add audit logs for publish, submit, score override, and report export.

### P.4 Data protection

- Do not store raw audio unless explicitly required.
- Retain transcript and evaluation data according to a documented policy.
- Avoid exposing expected answers to student endpoints.
- Avoid logging passwords, tokens, full transcripts, or sensitive report payloads by default.
- Use HTTPS outside localhost.

## Q. Performance and Scalability Considerations

### Q.1 Database

- Use one indexed relational schema.
- Index `users.email`, `questions.owner_id`, `vivas.owner_id/status`, `viva_assignments.student_id/viva_id`, `attempts.student_id/viva_id/status`, and `answers.attempt_id`.
- Use transactions for publish and final submit.
- Enable SQLite WAL for local demos.
- Move to PostgreSQL when concurrent students or durable deployment requires it.

### Q.2 Evaluation

- Do not load a model once per request.
- Cache one provider/model per worker where safe.
- Avoid repeated embeddings for the same published expected answer; cache by question version.
- Cap transcript length and evaluation work.
- Use an evaluation job/queue when model latency threatens request time.
- Make submission return `Evaluating` if asynchronous evaluation is introduced.
- Limit worker count according to CPU/GPU memory.

### Q.3 Frontend/API

- Fetch available vivas once per dashboard load with explicit refresh.
- Autosave only changed answer drafts with debouncing.
- Do not poll localStorage for production monitoring.
- Use server pagination for teacher attempts.
- Use typed API clients generated or manually aligned with backend schemas.
- Remove global-latest fallbacks that can display the wrong student's result.

### Q.4 Duplicate and retry control

- Idempotency key on create attempt and final submit.
- Unique constraint on one active attempt per student/viva if policy allows.
- Server-side state machine rejects late writes.
- Retry only safe reads or idempotent writes.

## R. Risks and Tradeoffs

| Decision | Benefit | Risk/tradeoff | Mitigation |
|---|---|---|---|
| Modular monolith | One deployment and clear ownership | Backend can become large | Keep strict internal modules and service interfaces |
| Browser speech primary | Simple, low server load, matches current UI | Browser support/privacy/network variability | Target tested browser, feature detection, typed fallback, document behavior |
| Quarantine Whisper | Avoids CPU/GPU and audio transport complexity | Offline/local speech is deferred | Benchmark browser path and retain adapter boundary |
| One database | No split-brain state | Migration complexity and larger schema | Staged migration, legacy backups, versioned migrations |
| SQLite for local demo | No separate DB server | Limited concurrent writes | WAL, short transactions, PostgreSQL deployment profile |
| PostgreSQL for shared deployment | Better concurrency/durability | Operational dependency | Provide managed/local deployment instructions |
| Server-side publish snapshots | Correct cross-device behavior | More schema/version complexity | Immutable published versions and migration tests |
| Asynchronous evaluation | Better concurrency under model load | More status/state complexity | Explicit `Evaluating` status and polling/refresh |
| Remove live monitoring from core | Simpler and safer release | Loses a marketed feature | Reintroduce only with a concrete server telemetry requirement |
| Real PDF export | Honest teacher workflow | Adds rendering/dependency maintenance | Start with PDF and CSV; test output fixtures |
| No fabricated empty-state analytics | Trustworthy product | Less visually impressive demo with no data | Seed demo data explicitly in development mode only |

### R.1 Live monitoring decision

Remove live monitoring from the core release unless cross-device proctoring is a confirmed requirement.

The current implementation is not actual monitoring. A real version would require:

- authenticated session telemetry;
- WebSocket or server-sent events;
- server-side active-session state;
- camera/audio policy and transport;
- retention and privacy controls;
- reconnect and stale-session logic;
- load testing with many active students.

Those costs are substantial and unrelated to the core reliable viva flow. Keep a simple server-side attempt status page instead: teachers can see `Not Started`, `In Progress`, `Submitted`, `Evaluating`, and `Completed` when they refresh or use a controlled short polling endpoint.

### R.2 What remains uncertain

These decisions require human confirmation before implementation:

1. Whether offline speech is a hard requirement.
2. Whether raw audio must be retained.
3. Target browsers and supported languages, especially Hinglish.
4. Expected simultaneous student count.
5. Whether student assignment is per student, cohort, department, or open-to-all.
6. Whether teachers may edit scores or only add comments.
7. Whether historical data in all SQLite files must be preserved.
8. Whether PostgreSQL is acceptable for the deployment environment.
9. Required export formats and report retention period.
10. Whether admin is a separate role or should be merged into teacher/owner permissions.

Before coding, resolve these with a short product decision record. Do not let implementation silently choose them.

## S. Definition of Done

The refactor is complete only when all of the following are true.

### S.1 Startup

- [ ] One documented command starts the application.
- [ ] No unnecessary proxy or independent service windows open.
- [ ] Backend readiness is checked before the browser opens.
- [ ] Startup failure identifies the missing dependency or failed health check.
- [ ] One combined log location is documented.
- [ ] Clean-machine startup has been tested.

### S.2 Data and database

- [ ] One server-side database is authoritative.
- [ ] No production question, user, publication, attempt, score, or result depends on localStorage.
- [ ] Schema migrations are repeatable.
- [ ] Legacy databases are backed up and migration results are verified.
- [ ] Published viva question snapshots are immutable.

### S.3 Authentication and authorization

- [ ] Student and teacher login are backend-authenticated.
- [ ] Passwords are hashed and no default production accounts exist.
- [ ] Frontend routes enforce role-aware access.
- [ ] Backend routes enforce role and ownership.
- [ ] A student cannot read another student's attempt by changing any URL/body ID.
- [ ] A teacher cannot access another teacher's private drafts or unauthorized attempts.
- [ ] CORS, rate limits, and upload limits are configured.

### S.4 Teacher workflow

- [ ] Teacher can create, edit, archive, and view owned questions.
- [ ] Teacher can preview and commit supported imports transactionally.
- [ ] Teacher can create a viva from server questions.
- [ ] Teacher can save a draft and preview it.
- [ ] Teacher can publish it through a real backend state transition.
- [ ] A student on a different browser can see an assigned published viva.
- [ ] Teacher can filter/paginate attempts.
- [ ] Teacher can open a complete attempt with every answer and evaluation.
- [ ] Teacher can add permitted comments.
- [ ] Teacher can download a genuine report in the supported format.

### S.5 Student workflow

- [ ] Student can log in through the backend.
- [ ] Student sees only assigned/available vivas.
- [ ] Student can start one server-tracked attempt.
- [ ] Student sees one question at a time without expected answers.
- [ ] Student can speak, edit, retry, confirm, and review answers.
- [ ] Student can submit exactly once or receive a clear already-submitted response.
- [ ] Submission survives refresh/network retry without duplicate attempts.
- [ ] Student sees evaluation status and final result.
- [ ] Student sees only their own submitted answers and feedback.

### S.6 Speech

- [ ] The selected primary speech approach is documented.
- [ ] Unsupported browsers have a typed-answer fallback.
- [ ] Transcript lifecycle and answer editing are tested.
- [ ] The UI does not claim audio recording unless it is implemented.
- [ ] Privacy/data-retention behavior is documented.
- [ ] Python Whisper is either formally integrated behind the speech contract or explicitly quarantined and removed from active documentation.

### S.7 Validation and evaluation

- [ ] There is one public submission/evaluation contract.
- [ ] No UI code calls internal validation/evaluation routes.
- [ ] No broken `/evaluate` call remains.
- [ ] One scoring engine and versioned rubric are used for production grades.
- [ ] Empty, invalid, partial, correct, noisy, and model-failure cases are tested.
- [ ] Evaluation failures are visible and not silently converted into a different grade.
- [ ] Every evaluation stores method/version metadata.

### S.8 Reports and analytics

- [ ] No fake report records are generated.
- [ ] No text file is labeled PDF.
- [ ] Analytics show real data or clearly labeled empty states.
- [ ] Export contents match the selected attempt/viva and authorization scope.
- [ ] Export generation is tested with real stored answers and feedback.

### S.9 Operations and quality

- [ ] Unit, integration, security, end-to-end, and basic load tests pass.
- [ ] API schemas and frontend types agree.
- [ ] Structured logs include request IDs and evaluation status.
- [ ] Documentation matches actual runtime behavior.
- [ ] The old architecture is not required to understand or operate the new application.

## Recommended First Implementation Order

If the team needs a short prioritized backlog, use this order:

1. Confirm product decisions in Section R.2.
2. Create the modular backend shell and one database migration layer.
3. Implement real auth and authorization before moving data flows.
4. Migrate questions and replace localStorage Question Bank authority.
5. Implement vivas, assignments, draft/preview/publish.
6. Implement server-tracked student attempts and review-before-submit.
7. Replace validation/evaluation HTTP calls with one internal EvaluationService.
8. Migrate result views and enforce student/teacher access rules.
9. Implement real report export.
10. Replace the launcher with readiness-aware one-command startup.
11. Remove or quarantine proxy, fake features, disconnected speech/evaluation runtime, and legacy DBs only after migration verification.

**Final architectural principle:** The browser is a client, not the system of record. The modular backend and one database own identity, questions, publication, attempts, evaluation, and results. Every visible teacher/student action must correspond to a real, testable domain operation or be explicitly labeled as a local development-only feature.
