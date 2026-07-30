# 🎓 Real-Time AI Viva Examination & Monitoring System (VivaAI)

An end-to-end, real-time AI-powered oral viva examination, automated evaluation, live proctoring, and student performance analytics platform. Built with **React 18**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **Python**, **Web Speech API**, **WebRTC Video Proctoring**, and **SQLite**.

---

## 🌟 Key Features

### 👨‍🎓 Student Portal
- **🎙️ Real-Time Spoken Viva Examination**:
  - Continuous live speech recognition (Web Speech API) transcribes student answers as they speak.
  - Text-to-Speech (TTS) engine reads viva questions aloud to the student.
  - Live WebCam video proctoring feed for identity verification and anti-cheating supervision.
- **📊 Interactive Result Dashboard**:
  - **Assessment Selector Dropdown**: Switch seamlessly between all completed viva test attempts.
  - 5-Metric Evaluation Breakdown: *Communication*, *Concept Understanding*, *Accuracy*, *Fluency*, and *Depth*.
  - Visual score radar charts, section-wise performance bars, and overall grade assignments.
- **💬 Personalized AI Feedback**:
  - Comprehensive feedback summary detailing Strengths, Areas for Improvement, and General Recommendations.
  - Topic-by-Topic AI Examiner comments on every individual question.

---

### 👩‍🏫 Faculty Portal
- **📡 Real-Time Live Monitoring Dashboard**:
  - Live 1-second telemetry heartbeat tracks active student exam sessions in real time.
  - View current question progress, real-time speech transcripts, elapsed time, and recording status.
  - **Proctor Actions**: Flag suspicious sessions with custom alerts pushed directly to the active student screen, or clear flags.
- **📁 Real-Time Individual Student Reports & PDF Export**:
  - View detailed **Individual Student Viva Reports** for every student attempt directly from the SQLite database.
  - Includes full question-by-question spoken response transcripts, expected answers, and AI ratings.
  - Instant **PDF Report Export** and custom report generation for individual students or full batches.
- **📈 Advanced Analytics Dashboard**:
  - Multi-tab performance trends, score distribution histograms, department comparisons, and speech fluency analytics.
- **📚 Question Bank & PDF Extractor**:
  - Add, edit, or upload question banks via PDF text extractor (`Q 1. Question / Ans: Answer`).

---

### 🛡️ Admin Portal
- **👥 Student & Faculty Management**: Register, view, and manage student roll numbers and faculty accounts.
- **📄 Automated PDF Syllabus Upload**: Upload course textbooks or PDFs to auto-extract structured question banks.

---

## 🏗️ System Architecture & Microservices

```
                        ┌────────────────────────────────────────┐
                        │        Vite React UI Portal            │
                        │       (Port 5173 / Node.js)            │
                        └───────────────────┬────────────────────┘
                                            │ REST API Calls
                                            ▼
                        ┌────────────────────────────────────────┐
                        │           API Gateway Proxy            │
                        │      (proxy_server.py / Port 8000)     │
                        └───────┬───────────┬────────────┬───────┘
                                │           │            │
       ┌────────────────────────┘           │            └────────────────────────┐
       ▼                                    ▼                                     ▼
┌────────────────────────┐    ┌────────────────────────┐             ┌────────────────────────┐
│  Question Module API   │    │ Validation Module API  │             │ Result & Storage API   │
│  (main.py / Port 8001) │    │(app.main:app / Port 8002)            │  (server.py / Port 8010)│
└────────────────────────┘    └────────────────────────┘             └────────────────────────┘
```

| Service | Port | Description |
| :--- | :--- | :--- |
| **Vite UI Frontend** | `5173` | React, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| **API Gateway Proxy** | `8000` | Unified route proxy directing requests to microservices |
| **Question Module** | `8001` | Manages course question banks, categories, and PDF parsing |
| **Validation Module** | `8002` | Natural language evaluation and answer comparison engine |
| **Result Storage API** | `8010` | Evaluates multi-question payloads, computes 5 breakdown metrics, and persists attempts in SQLite |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.9 or higher)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Akash-gosain07/Viva_Ai_System.git
cd Viva_Ai_System
```

### 2. Automated Launcher (Recommended)

#### On Windows:
Double-click `run_ai_viva.bat` or run:
```cmd
run_ai_viva.bat
```

#### On macOS / Linux:
```bash
chmod +x run_ai_viva_mac.sh
./run_ai_viva_mac.sh
```

---

### 3. Manual Step-by-Step Setup

#### Step A: Install & Run Frontend
```bash
cd Viva_UI_Module-main/Viva_UI_Module-main
npm install
npm run dev
```

#### Step B: Install Python Dependencies & Start Microservices
```bash
# Terminal 1: Question Module
cd ai_viva_question_module-main/ai_viva_question_module-main
pip install fastapi uvicorn sqlite3
python -m uvicorn main:app --host 127.0.0.1 --port 8001

# Terminal 2: Validation Module
cd Validation-Module_AI-Viva-main/Validation-Module_AI-Viva-main
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002

# Terminal 3: Result & Storage API
cd result_storage_module
python server.py

# Terminal 4: API Gateway Proxy
python proxy_server.py
```

---

## 🌐 Application Access Endpoints

- **Student Portal**: `http://127.0.0.1:5173/student/dashboard`
- **Student Viva Exam**: `http://127.0.0.1:5173/student/viva`
- **Result Dashboard**: `http://127.0.0.1:5173/student/results`
- **Faculty Live Monitoring**: `http://127.0.0.1:5173/faculty/monitoring`
- **Faculty Reports & Export**: `http://127.0.0.1:5173/faculty/reports`
- **Faculty Analytics**: `http://127.0.0.1:5173/faculty/analytics`
- **API Gateway Proxy**: `http://127.0.0.1:8000`

---

## 📄 License & Credits
Built for AI-driven oral examination automation and real-time proctoring. Designed and maintained by Akash Gosain.
