"""Checks every lesson in src/data/lessons.json with real Python.

- Each coding challenge's reference solution (tests/solutions.json) must pass.
- Each starter must NOT pass (so learners can't win by pressing Run), except
  demo steps whose starter is the solution (e.g. "watch it crash").
- Each predict-the-output question's answer must match what the code prints.
- Structure: answers are options, feedback keys are options, hints and
  explanations are present.

Run from the frontend folder:  python scripts/check_lessons.py
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = json.loads((ROOT / "src" / "data" / "lessons.json").read_text(encoding="utf-8"))
SOLUTIONS = json.loads((ROOT / "tests" / "solutions.json").read_text(encoding="utf-8"))


def run(code: str):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "main.py"
        path.write_text(code, encoding="utf-8")
        try:
            p = subprocess.run([sys.executable, "main.py"], cwd=tmp, capture_output=True, text=True, timeout=10, stdin=subprocess.DEVNULL)
        except subprocess.TimeoutExpired:
            return "", "Timeout: ran longer than 10 seconds"
        return p.stdout, p.stderr


def norm(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.replace("\r\n", "\n").split("\n")).strip()


def raised(stderr: str) -> str:
    lines = stderr.strip().split("\n")
    return lines[-1].split(":")[0].strip() if lines and lines[-1] else ""


def passes(step, code) -> bool:
    out, err = run(code)
    if step.get("expected_error"):
        return raised(err) == step["expected_error"]
    return not err and norm(out) == norm(step["expected_output"])


problems = []
counts = {"code": 0, "predict": 0, "quiz": 0, "text": 0}
unit_ids = {u["id"] for u in COURSE["units"]}

for lesson in COURSE["lessons"]:
    if lesson["unit"] not in unit_ids:
        problems.append(f"{lesson['id']}: unknown unit {lesson['unit']}")
    for i, step in enumerate(lesson["steps"]):
        where = f"{lesson['id']} step {i + 1}"
        kind = step["type"]
        if kind == "text":
            counts["text"] += 1
        elif kind == "quiz":
            counts["predict" if step.get("code") else "quiz"] += 1
            opts = step["options"]
            if "answer" in step and step["answer"] not in opts:
                problems.append(f"{where}: answer not in options")
            for key in step.get("feedback", {}):
                if key not in opts:
                    problems.append(f"{where}: feedback for unknown option {key!r}")
            if not step.get("explanation"):
                problems.append(f"{where}: quiz has no explanation")
            if step.get("code"):
                out, err = run(step["code"])
                if err or norm(out) != norm(step["answer"]):
                    problems.append(f"{where}: predict answer {step['answer']!r} but code printed {norm(out)!r} {err.strip()[-80:]}")
        elif kind == "code":
            counts["code"] += 1
            key = f"{lesson['id']}:{i}"
            if not step.get("hint"):
                problems.append(f"{where}: coding step has no hint")
            solution = SOLUTIONS.get(key)
            if solution is None:
                problems.append(f"{where}: no reference solution ({key})")
                continue
            if not passes(step, solution):
                problems.append(f"{where}: reference solution does not pass")
            if step["initial_code"] != solution and passes(step, step["initial_code"]):
                problems.append(f"{where}: starter code already passes")

total = sum(counts.values())
print(f"{len(COURSE['units'])} units, {len(COURSE['lessons'])} lessons, {total} steps: "
      f"{counts['text']} text, {counts['quiz']} quiz, {counts['predict']} predict-the-output, {counts['code']} coding")
if problems:
    print(f"\n{len(problems)} problem(s):")
    for p in problems:
        print(" -", p)
    sys.exit(1)
print("All lesson checks passed.")
