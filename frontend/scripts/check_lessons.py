"""Checks every lesson in src/data/lessons.json with real Python.

- Each coding challenge's reference solution (tests/solutions.json) must pass.
- Each starter must NOT pass (so learners can't win by pressing Run), except
  demo steps whose starter is the solution (e.g. "watch it crash").
- Each predict-the-output question's answer must match what the code prints.
- Structure: answers are options, feedback keys are options, hints and
  explanations are present.
- Every explanation with example code says how the syntax works and what it's used
  for, and every exercise (except demos) has 1-2 check-in support tiers whose
  examples run without errors and don't give away the reference solution.

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

about = COURSE.get("about") or {}
for key in ("tagline", "outcomes", "paths", "next_steps"):
    if not about.get(key):
        problems.append(f"about: missing {key}")
for unit in COURSE["units"]:
    for key in ("prepares", "applications"):
        if not unit.get(key):
            problems.append(f"unit {unit['id']}: missing {key}")

for lesson in COURSE["lessons"]:
    if lesson["unit"] not in unit_ids:
        problems.append(f"{lesson['id']}: unknown unit {lesson['unit']}")
    for key in ("why", "unlocks"):
        if not lesson.get(key):
            problems.append(f"{lesson['id']}: missing {key}")
    seen_ids = set()
    for i, step in enumerate(lesson["steps"]):
        where = f"{lesson['id']} step {i + 1}"
        sid = step.get("id")
        if not isinstance(sid, str) or not sid:
            problems.append(f"{where}: missing step id")
        elif sid in seen_ids:
            problems.append(f"{where}: duplicate step id {sid!r}")
        seen_ids.add(sid)
        kind = step["type"]
        if kind == "text":
            counts["text"] += 1
            if step.get("example_code"):
                for key in ("how", "use"):
                    if not step.get(key):
                        problems.append(f"{where}: explanation has no {key!r}")
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
            key = f"{lesson['id']}:{step.get('id')}"
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
            demo = step["initial_code"] == solution
            tiers = step.get("support")
            if demo:
                if tiers:
                    problems.append(f"{where}: demo steps don't get a check-in")
            elif not isinstance(tiers, list) or not 1 <= len(tiers) <= 2:
                problems.append(f"{where}: exercise needs 1 or 2 check-in support tiers")
            else:
                for t, tier in enumerate(tiers, 1):
                    if not tier.get("heading") or not tier.get("content"):
                        problems.append(f"{where}: support tier {t} needs a heading and content")
                    example = tier.get("example_code")
                    if example:
                        out, err = run(example)
                        if err:
                            problems.append(f"{where}: support tier {t} example raises {err.strip()[-80:]}")
                        if norm(example) == norm(solution) or (len(norm(solution)) > 30 and norm(solution) in norm(example)):
                            problems.append(f"{where}: support tier {t} example gives away the solution")

# Legacy (index-based) progress maps to step ids through a frozen file. Removing a step that
# appears there is allowed, but reusing its id for a different step would corrupt old progress.
LEGACY = json.loads((ROOT / "src" / "data" / "legacy-step-ids.json").read_text(encoding="utf-8"))["lessons"]
for lesson in COURSE["lessons"]:
    legacy_ids = LEGACY.get(lesson["id"], [])
    if len(set(legacy_ids)) != len(legacy_ids):
        problems.append(f"{lesson['id']}: legacy-step-ids.json has duplicate ids")

total = sum(counts.values())
print(f"{len(COURSE['units'])} units, {len(COURSE['lessons'])} lessons, {total} steps: "
      f"{counts['text']} text, {counts['quiz']} quiz, {counts['predict']} predict-the-output, {counts['code']} coding")
if problems:
    print(f"\n{len(problems)} problem(s):")
    for p in problems:
        print(" -", p)
    sys.exit(1)
print("All lesson checks passed.")
