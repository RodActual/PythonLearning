"""Appends deep-dive and interview steps from expand/lessons/*.py into lessons.json.

Each lesson file defines DEEP and INTERVIEW lists built with T/Q/C below. Step ids are
d01.. (deep-dive) and i01.. (interview). Expected output is computed by running the
reference solution, which is also written to tests/solutions.json. Re-running replaces
a lesson's optional steps, so files can be edited and rebuilt.
Usage: python3 build.py <frontend dir> [lesson ids...]
"""
import json, os, runpy, subprocess, sys, tempfile, glob

HERE = os.path.dirname(os.path.abspath(__file__))
FRONT = sys.argv[1]
ONLY = set(sys.argv[2:])
LESSONS = os.path.join(FRONT, 'src', 'data', 'lessons.json')
SOLS = os.path.join(FRONT, 'tests', 'solutions.json')


def run(code):
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, 'main.py')
        open(p, 'w').write(code)
        r = subprocess.run([sys.executable, 'main.py'], cwd=tmp, capture_output=True, text=True, timeout=10, stdin=subprocess.DEVNULL)
        return r.stdout, r.stderr


def T(heading, content, example=None, how=None, use=None):
    s = {'type': 'text', 'heading': heading, 'content': content}
    if example: s['example_code'] = example
    if how: s['how'] = how
    if use: s['use'] = use
    return s


def Q(question, options, answer, explanation, code=None, feedback=None):
    s = {'type': 'quiz', 'question': question, 'options': options, 'answer': answer, 'explanation': explanation}
    if code: s['code'] = code
    if feedback: s['feedback'] = feedback
    return s


def C(heading, instruction, starter, solution, hint, tiers, error=None):
    s = {'type': 'code', 'heading': heading, 'instruction': instruction, 'initial_code': starter, '_solution': solution, 'hint': hint,
         'support': [dict(heading=h, content=c, **({'example_code': e} if e else {})) for h, c, e in tiers]}
    if error:
        s['expected_error'] = error
    return s


course = json.load(open(LESSONS, encoding='utf-8'))
sols = json.load(open(SOLS, encoding='utf-8'))
by_id = {l['id']: l for l in course['lessons']}
helpers = {'T': T, 'Q': Q, 'C': C}
problems = []
for f in sorted(glob.glob(os.path.join(HERE, 'lessons', '*.py'))):
    lid = os.path.splitext(os.path.basename(f))[0]
    if ONLY and lid not in ONLY:
        continue
    mod = runpy.run_path(f, init_globals=helpers)
    lesson = by_id[lid]
    core = [s for s in lesson['steps'] if not s.get('track')]
    for k in [k for k in sols if k.startswith(lid + ':') and k.split(':')[1][0] in 'di']:
        del sols[k]
    new = []
    for track, prefix, items in (('deep-dive', 'd', mod['DEEP']), ('interview', 'i', mod['INTERVIEW'])):
        for n, item in enumerate(items, 1):
            step = {'id': f'{prefix}{n:02d}', 'type': item['type'], 'track': track}
            step.update({k: v for k, v in item.items() if k not in ('type', '_solution')})
            if item['type'] == 'code':
                sol = item['_solution']
                out, err = run(sol)
                if 'expected_error' not in step:
                    if err:
                        problems.append(f"{lid}:{step['id']} solution errors: {err.strip()[-200:]}")
                    step['expected_output'] = out.rstrip('\n')
                sols[f"{lid}:{step['id']}"] = sol
                # keep key order readable
                order = ['id', 'type', 'track', 'heading', 'instruction', 'initial_code', 'expected_output', 'expected_error', 'hint', 'support']
                step = {k: step[k] for k in order if k in step}
            new.append(step)
    lesson['steps'] = core + new
    print(f"{lid}: {len(core)} core + {len(new)} new = {len(core) + len(new)}")

json.dump(course, open(LESSONS, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(LESSONS, 'a').write('\n')
json.dump(sols, open(SOLS, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
for p in problems:
    print('PROBLEM', p)
sys.exit(1 if problems else 0)
