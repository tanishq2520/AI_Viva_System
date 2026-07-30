from database import init_results_db, save_result
from evaluator import evaluate_answer
from question_bank import load_question_bank, load_speech_answers


def run_evaluation():
    question_bank = load_question_bank()
    speech_answers = load_speech_answers()

    init_results_db()

    results = []
    unmatched = []

    for item in speech_answers:
        matched = question_bank.get(item["normalized_question"])
        if not matched:
            unmatched.append(item)
            continue

        evaluation = evaluate_answer(
            question_text=item["question_text"],
            expected_answer=matched["answer_text"],
            student_answer=item["student_answer"],
        )
        result = {
            "speech_question_id": item["speech_question_id"],
            "question_text": item["question_text"],
            "expected_answer": matched["answer_text"],
            "student_answer": item["student_answer"],
            **evaluation,
        }
        save_result(result)
        results.append(result)

    total_score = sum(item["score"] for item in results)
    max_score = len(results) * 10
    percentage = (total_score / max_score * 100.0) if max_score else 0.0

    print("\nEvaluation complete")
    print(f"Matched answers: {len(results)}")
    print(f"Unmatched questions: {len(unmatched)}")
    print(f"Total score: {total_score}/{max_score}")
    print(f"Percentage: {percentage:.2f}%")

    if unmatched:
        print("\nUnmatched questions:")
        for item in unmatched:
            print(f"- [{item['speech_question_id']}] {item['question_text']}")


if __name__ == "__main__":
    run_evaluation()
