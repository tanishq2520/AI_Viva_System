# AI Viva Evaluation Module

This module is designed to sit between these two repos:
- `Viva-speech-Module`
- `ai_viva_question_module`

## What it reads from each module

From the speech module:
- reads `viva.db`
- uses `viva_questions.question_text`
- uses `viva_questions.viva_answers`

From the question module:
- reads the expected answers from the `questions` table
- uses `question_text`
- uses `answer_text`

## How the integration works

1. The speech module records and transcribes the student's spoken answer.
2. This evaluation module reads those transcriptions from `viva.db`.
3. It reads the expected answers from the question module database or from `question_bank.db`.
4. It matches questions using normalized `question_text`.
5. It sends:
   - question
   - expected answer
   - student transcribed answer
   to OpenAI for grading.
6. It stores results in `evaluation_results.db`.

## Files

- `main.py`
  Runs the full evaluation flow.
- `evaluator.py`
  Contains the OpenAI LLM scoring logic.
- `question_bank.py`
  Loads question-answer data from the question module and speech answers from the speech module.
- `database.py`
  Settings and results database helpers.
- `export_question_bank.py`
  Optional helper to export the question module's `questions` table into a local SQLite file.

## Setup

1. Create `.env` from `.env.example`
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. If you have direct database access to the question module:

```bash
python export_question_bank.py
```

4. Run evaluation:

```bash
python main.py
```

## Output

The module creates `evaluation_results.db` with:
- score
- verdict
- strengths
- missing points
- feedback

## OpenAI usage

The evaluator uses the OpenAI Python SDK with the Responses API.
It expects:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Default model in this project:
- `gpt-5.6`
