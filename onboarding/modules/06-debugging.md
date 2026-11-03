# Lesson 6: Reading and debugging code

**What you'll be able to do:** find your way around code someone else wrote, read an error report, pause a program to look inside it, and fix bugs based on evidence instead of guesses.

**Time:** about 1 day. You can do this lesson at any point; it doesn't need the others.

**Before you start:** open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.

---

## 1. The ideas, in plain words

### Read an error report from the bottom up

When a Python program crashes, it prints a **traceback**: the chain of function calls that led to the error. For example:

```
Traceback (most recent call last):
  File ".../bughunt/usage_report.py", line 62, in main
    print(json.dumps(summarize(text.splitlines()), indent=2))
  File ".../bughunt/usage_report.py", line 47, in summarize
    if slowest is None or record["ms"] < slowest["ms"]:
KeyError: 'ms'
```

Read it from the **bottom**:

1. The last line is the error type and message: `KeyError: 'ms'`. A `KeyError` means the code asked a dictionary for a key it doesn't have.
2. The lines just above show where it happened: `usage_report.py`, line 47, in `summarize`, with the actual line of code.
3. Further up is how the program got there.

When a traceback runs through many files, look for the lowest line that's in **this project's** files. That's usually where to start.

Common error types:

| Error | Usually means |
|---|---|
| `KeyError` | A dictionary doesn't have that key |
| `TypeError` | A value is the wrong type, like adding text to a number |
| `ValueError` | The right type but an unusable value, like `int("abc")` |
| `ZeroDivisionError` | Dividing by zero |
| `AttributeError` | Something doesn't have that property or method, often because it's `None` |

### Pause a program and look inside: `breakpoint()`

Put the line `breakpoint()` in the code and run it. The program stops at that line and gives you a `(Pdb)` prompt where you can inspect everything. Type a command and press Enter:

| Command | What it does |
|---|---|
| `p name` | Print the value of `name` (any variable or expression) |
| `pp name` | Print it neatly, for long values |
| `n` | Run the next line |
| `s` | Step into the function on this line |
| `c` | Continue running until the next `breakpoint()` |
| `l` | Show the code around where you are |
| `w` | Show the chain of calls that got here |
| `q` | Quit |

Remove `breakpoint()` lines when you're done.

### Logging: notes the program writes as it runs

`print` is fine for a quick look. **Logging** is the lasting version: each message has a level (`DEBUG`, `INFO`, `WARNING`, `ERROR`), a time, and the file it came from, and it keeps working once the program is running on a server. Each file in this project creates a logger with `log = logging.getLogger(__name__)` and writes messages with lines like `log.info("registered item %s", item.id)`. Inside an `except` block, `log.exception("...")` also records the full traceback.

### A method that works on any bug

1. **Reproduce it:** make the bug happen on purpose.
2. **Capture it in a test** that fails because of the bug.
3. **Form one guess** about the cause.
4. **Check the guess** with `breakpoint()` or a log line. Don't change code yet.
5. **Fix it**, and watch the test pass.
6. **Run all the tests** to make sure nothing else broke.

### Finding your way around new code

Start where the program starts (here, `create_app` in `catalog/api.py`), follow one request all the way through, and write down each function it passes. Read the tests too; they're working examples of how the code is meant to be used.

### Want more?

- [Python tutorial: errors and exceptions](https://docs.python.org/3/tutorial/errors.html)
- [pdb, the Python debugger](https://docs.python.org/3/library/pdb.html)
- [Logging HOWTO](https://docs.python.org/3/howto/logging.html)

---

## 2. Practice: follow one request through the code

You'll trace a search for "sales" filtered to tag "erp".

**Step 1.** Open `catalog/api.py` and find `search_items`. Follow what it calls: open each function it uses, in the file it's in. Write down the path as a list of `file: function` lines.

<details><summary>Answer</summary>

1. `catalog/api.py`: `search_items`
2. `catalog/service.py`: `CatalogService.search`
3. `catalog/search.py`: `InMemorySearch.search`
4. Back in `catalog/service.py`: `CatalogService.search` calls `ItemRepository.get_many` in `catalog/repository.py`
</details>

**Step 2.** Check your notes with the debugger.

1. In `catalog/search.py`, find `InMemorySearch.search`. Add a new first line inside it: `breakpoint()`, indented like the line below it. Save.
2. Run:

   ```bash
   pytest tests/test_api.py -k "test_search" -s
   ```

3. The run stops at a `(Pdb)` prompt. Type `w` and press Enter. You'll see the chain of calls; the bottom ones are the files you listed.
4. Type `p text` and press Enter to see the search words. Type `c` and press Enter to let it finish.
5. Delete the `breakpoint()` line and save.

---

## 3. Exercise: the bug hunt

`bughunt/usage_report.py` is a small script the operations team runs each morning. It reads the service's access log (`bughunt/access.log`) and prints a summary. The team has reported four problems; they're listed at the top of the file. Your job is to find and fix all four.

**Rules:**

- Don't change `exercises/test_m6_bughunt.py` or `bughunt/access.log`.
- For each bug, write one line in a notes file: what went wrong, the evidence that pointed to the cause, and your fix.
- At least once, find the cause with `breakpoint()` rather than by reading alone.

**Step 1.** Run the script and see the first problem:

```bash
python -m bughunt.usage_report bughunt/access.log
```

On Windows, if `python` isn't found, use `py` instead.

**Step 2.** Run the checks:

```bash
pytest exercises/test_m6_bughunt.py
```

All 4 fail at first. Each failure points at a different problem. Fix one problem at a time, rerun, and move to the next.

**Step 3.** Open `bughunt/access.log` to see the data. Each line is one request: its address (`path`), result code (`status`) and time in milliseconds (`ms`). One line is broken on purpose, and one is missing `ms`.

<details><summary>Hint for "The report crashed this morning"</summary>

Read the traceback from the bottom. Which key is missing, and on which line of the log? Some records simply don't have that field. The code needs to skip such records when looking for the slowest one, while still counting them.
</details>

<details><summary>Hint for "Error rate says 0% but we had outages"</summary>

Look at how the code decides a request is an error. Which status codes in the log are server errors? Is `500` itself being counted?
</details>

<details><summary>Hint for "Slowest endpoint is always /health"</summary>

`/health` is the fastest request in the log. Look at the comparison that picks `slowest`: which way does it point?
</details>

<details><summary>Hint for "It crashes on a quiet day when the log is empty"</summary>

With no records, `total` is 0. What happens on the line that works out `error_rate`?
</details>

<details><summary>Show the answer</summary>

Three lines change in `summarize`:

1. **Crash on a record without `ms`, and slowest is always `/health`** (one line, two bugs). Change

   ```python
           if slowest is None or record["ms"] < slowest["ms"]:
   ```

   to

   ```python
           if "ms" in record and (slowest is None or record["ms"] > slowest["ms"]):
   ```

2. **Error rate misses outages.** Change `if record["status"] > 500:` to `if record["status"] >= 500:`. Status 500 is itself a server error.

3. **Crash on an empty log.** Change `"error_rate": round(errors / total, 3),` to `"error_rate": round(errors / total, 3) if total else 0.0,`.
</details>

---

## 4. Finished?

```bash
pytest exercises/test_m6_bughunt.py
```

It should show `4 passed`. Your notes should have four "what went wrong → evidence → fix" lines and the request path from section 2.

---

## 5. Check yourself

**a. A traceback runs through 15 lines in other libraries' files and 2 in this project's. Which do you open first?**

<details><summary>Answer</summary>

The lowest one in this project's files. The libraries are usually fine; the problem is most often in how this project used them.
</details>

**b. Why use `log.exception` rather than `log.error` inside an `except` block?**

<details><summary>Answer</summary>

`log.exception` also records the full traceback, so whoever reads the log later can see exactly where the error happened.
</details>

**c. A bug happens on the server but not on your computer. What would you add to find it?**

<details><summary>Answer</summary>

Log lines around the suspect code, recording the values it works with, at `DEBUG` or `INFO` level, then reproduce it on the server and read the log. Never log passwords or other secrets.
</details>
