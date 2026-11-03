# Module 6: Reading and debugging code

**Goal:** find your way around code you didn't write, and find bugs from evidence instead of guessing. This is most of the first months in a sustainment role.

## Learn

- **Read a traceback from the bottom.** The last line is the error type and message. The frame just above it is where it happened. Walk up to find the first frame in *your* code; that's usually where to look. [Errors and exceptions](https://docs.python.org/3/tutorial/errors.html)
- **`breakpoint()`** stops the program and opens `pdb`. Commands: `p expr` print, `pp` pretty-print, `n` next line, `s` step into, `c` continue, `l` list code, `w` where (the stack), `u`/`d` move up/down the stack, `q` quit. [pdb](https://docs.python.org/3/library/pdb.html)
- `python -m pdb script.py` starts under the debugger; `pytest --pdb` opens it at the first failure; `pytest --lf` reruns only last failures.
- **Logging** beats `print`: levels (`DEBUG` to `CRITICAL`), timestamps, the module name, and it stays in production. Use `log = logging.getLogger(__name__)` per module and configure once at startup. `log.exception(...)` inside `except` records the traceback. [Logging HOWTO](https://docs.python.org/3/howto/logging.html)
- Use `%s` arguments (`log.info("item %s", item_id)`), not f-strings, so the message is only built if the level is on.
- **A method for any bug:** reproduce it; write a failing test; form one hypothesis; check it with a breakpoint or a log line; fix; watch the test pass; run the whole suite.
- **Reading a new codebase:** start at the entry point (`create_app`), follow one request end to end, and write down the call chain. Read the tests: they're examples of how the code is meant to be used. `git log -p path` and `git blame` show why a line exists.

## Read: trace a request

Follow `GET /search?q=sales&tag=erp` from `catalog/api.py` to the search backend and back. Write the chain of `file:function` calls in your notes, then check it by putting `breakpoint()` in `InMemorySearch.search` and running:

```bash
pytest tests/test_api.py -k search -s
```

At the prompt, type `w` to see the whole stack. Did it match your notes?

## Do: the bug hunt

`bughunt/usage_report.py` summarises an access log. Ops reported four problems (listed at the top of the file). Find and fix all four.

```bash
python -m bughunt.usage_report bughunt/access.log
pytest exercises/test_m6_bughunt.py
```

Rules: don't edit the tests or `access.log`. For each bug, write one line in your notes: the symptom, the evidence that pointed to the cause, and the fix. At least once, find the cause with `breakpoint()` rather than by reading.

## Done when

```bash
pytest exercises/test_m6_bughunt.py
```

passes, and your notes have four symptom → evidence → fix lines plus the request trace.

## Check yourself

- A traceback runs through 15 library frames and 2 of yours. Which frame do you open first?
- Why `log.exception` instead of `log.error` inside an `except` block?
- A bug happens in production but not locally. What would you log, and at what level?
