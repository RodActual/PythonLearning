# Backend onboarding track

This is a set of hands-on lessons for learning how backend software works: the part of an app that runs on a server, stores data, and answers requests. You'll learn it by working on one small, working program called the **Catalog Service**. It keeps a list of items (such as datasets or documents), lets you tag them, and lets you search them.

You don't need to know how to set any of this up. This page walks you through every step, from installing the tools to running your first check. If a word is new to you, look it up in the [word list](#word-list) at the bottom.

This track runs on your own computer, not on the PythonLearning website.

---

## What you need

- A Mac or Windows computer you can install programs on.
- An internet connection for the first setup.
- About 30 minutes for setup.
- About 10 working days to finish all seven lessons, at 1.5 to 2 hours a day.

You'll install two free programs:

| Program | What it's for | When you need it |
|---|---|---|
| **Python** (version 3.11, 3.12, 3.13 or 3.14) | Runs the Catalog Service and its checks | From the start |
| **Docker Desktop** | Runs a search engine and a packaged copy of the service | Only for lessons 5 and 7 |

---

## Part 1: Set up (one time only)

Do these steps in order. Each step says what you should see when it worked.

### Step 1: Install Python

**On a Mac**

1. Open https://www.python.org/downloads/ in your web browser.
2. Look at the yellow button. If it says **Download Python 3.14** (followed by more numbers, like 3.14.7), click it. If it shows a higher version, such as 3.15, don't use it: scroll down to **Looking for a specific release?**, click the newest version that starts with **Python 3.14**, and download the installer for your computer from that page. This course supports Python 3.11 to 3.14.
3. Open the file you downloaded (it ends in `.pkg`) and click **Continue** through the installer until it says the installation was successful.

**On Windows**

1. Open https://www.python.org/downloads/ in your web browser.
2. Look at the yellow button. If it says **Download Python 3.14** (followed by more numbers, like 3.14.7), click it. If it shows a higher version, such as 3.15, don't use it: scroll down to **Looking for a specific release?**, click the newest version that starts with **Python 3.14**, and download the installer for your computer from that page. This course supports Python 3.11 to 3.14.
3. Open the file you downloaded (it ends in `.exe`).
4. On the first screen, tick the box **Add python.exe to PATH**. This box is easy to miss, and later steps won't work without it.
5. Click **Install Now** and wait until it says **Setup was successful**.

### Step 2: Open a terminal

A **terminal** is a window where you type commands instead of clicking. Every command in this guide is typed into it. Type it exactly as shown, then press **Enter** (on a Mac, **Return**).

- **Mac:** press **Command + Space**, type `Terminal`, and press **Return**.
- **Windows:** click **Start**, type `PowerShell`, and click **Windows PowerShell**.

A window opens with a blinking cursor. Leave it open.

### Step 3: Check that Python is installed

Type this and press Enter.

**Mac:**

```bash
python3 --version
```

**Windows:**

```powershell
py --version
```

You should see something like `Python 3.12.7`. The first number must be 3 and the second must be between 11 and 14. If you see an error instead, go to [Problems and fixes](#problems-and-fixes).

### Step 4: Download the lessons

1. Open https://github.com/RodActual/PythonLearning in your web browser.
2. Click the green **Code** button, then click **Download ZIP**.
3. Find the downloaded file `PythonLearning-main.zip` in your **Downloads** folder and open it. On a Mac it unzips by itself; on Windows, right-click it, choose **Extract All**, and click **Extract**.

You now have a folder called `PythonLearning-main`. Inside it is a folder called `onboarding`. That's where this track lives.

### Step 5: Go to the onboarding folder in the terminal

The terminal works in one folder at a time. This step moves it into the `onboarding` folder.

**Mac:**

```bash
cd ~/Downloads/PythonLearning-main/onboarding
```

**Windows:**

```powershell
cd $HOME\Downloads\PythonLearning-main\PythonLearning-main\onboarding
```

On Windows, **Extract All** usually puts a `PythonLearning-main` folder inside another one, so the path above has it twice. If you get an error saying the path doesn't exist, type `cd ` (with a space after it), drag the `onboarding` folder from your file window into the terminal window, and press Enter. This works on a Mac too.

You'll know it worked when the line in the terminal ends with `onboarding`.

### Step 6: Create a private workspace for this project

This makes a folder called `.venv` that keeps this project's tools separate from everything else on your computer. You only do this once.

**Mac:**

```bash
python3 -m venv .venv
```

**Windows:**

```powershell
py -m venv .venv
```

Nothing is printed when it works. That's normal.

### Step 7: Turn the workspace on

You'll repeat this step every time you open a new terminal to work on the lessons (see [Part 2](#part-2-every-time-you-come-back)).

**Mac:**

```bash
source .venv/bin/activate
```

**Windows:**

```powershell
.venv\Scripts\Activate.ps1
```

You'll know it worked when `(.venv)` appears at the start of the line in the terminal. On Windows, if you see a red message about "running scripts is disabled", go to [Problems and fixes](#problems-and-fixes).

### Step 8: Install the project's tools

Check first that the line in the terminal starts with `(.venv)`. If it doesn't, do [Step 7](#step-7-turn-the-workspace-on) first. Installing without it puts the tools outside the workspace, and later steps won't find them.

This downloads the libraries the Catalog Service needs. It takes a minute or two.

```bash
pip install -r requirements-dev.txt
```

When it finishes, the last line starts with `Successfully installed`. You may also see a line about a newer version of pip being available; you can ignore it.

### Step 9: Run the checks to confirm everything works

```bash
pytest
```

After a few seconds you should see a line like:

```
39 passed, 1 skipped
```

**Passed** means a check ran and the program did the right thing. The one **skipped** check needs the search engine from lesson 5, so it's switched off for now. If you see the word **failed** or **error** here, go to [Problems and fixes](#problems-and-fixes).

### Step 10: Start the Catalog Service and look at it

```bash
uvicorn catalog.api:create_app --factory --reload
```

You should see a line that says `Uvicorn running on http://127.0.0.1:8000`. The service is now running on your computer.

1. Open http://localhost:8000/docs in your web browser. You'll see a page listing everything the service can do.
2. Click **POST /items**, then **Try it out**, then **Execute**. You've just added an item to the catalog.

To stop the service, click the terminal window and press **Control + C** (on Mac and Windows).

Setup is done.

---

## Part 2: Every time you come back

Each new terminal window starts fresh, so repeat these three things:

1. Open a terminal ([Step 2](#step-2-open-a-terminal)).
2. Go to the onboarding folder ([Step 5](#step-5-go-to-the-onboarding-folder-in-the-terminal)).
3. Turn the workspace on ([Step 7](#step-7-turn-the-workspace-on)) and check that `(.venv)` appears.

You don't need to repeat the other steps.

---

## Part 3: Working through the lessons

There are seven lessons. Do them in order, except lesson 6, which you can do any time.

| # | Lesson | What you'll learn | Time |
|---|---|---|---|
| 1 | [Data modeling and JSON](modules/01-data-modeling.md) | Describing data and checking it's valid | 1 day |
| 2 | [REST APIs with FastAPI](modules/02-rest-api.md) | How programs talk to each other over the web | 2 days |
| 3 | [Testing with pytest](modules/03-testing.md) | Writing checks that prove your code works | 1 day |
| 4 | [Databases with SQLAlchemy](modules/04-database.md) | Storing and finding data in a database | 2 days |
| 5 | [Search with OpenSearch](modules/05-search.md) | Making data searchable like a search engine | 1.5 days |
| 6 | [Reading and debugging code](modules/06-debugging.md) | Finding and fixing bugs in someone else's code | 1 day |
| 7 | [Packaging for containers](modules/07-packaging.md) | Making the program run the same on any computer | 1.5 days |

### How each lesson works

Each lesson file has the same parts:

1. **The ideas, in plain words**: what the lesson is about, with small examples and links to official guides if you want more.
2. **Look around the code**: which files to open and what to look for, with questions to answer as you read.
3. **Exercises**: step-by-step changes to make, each naming the exact file and spot to change.
4. **Finished?**: the commands that confirm you're done, and what they should print.
5. **Check yourself**: questions to answer without looking back.

Questions and exercises have grey **Answer**, **Hint** and **Show the answer** lines. Click one to open it. Try each exercise on your own first, open the hint if you're stuck, and open the answer only as a last resort; you'll learn far more from the first two.

To open the code files, use a code editor. [Visual Studio Code](https://code.visualstudio.com/) is free. Install it, open it, choose **File > Open Folder**, and pick the `onboarding` folder.

### How to tell an exercise is finished

Each lesson has its own checks. For lesson 1, run:

```bash
pytest exercises/test_m1_models.py
```

For other lessons, change the number: `test_m2_api.py` for lesson 2, and so on. The **Done when** part of each lesson gives the exact command.

**The first time you run a lesson's checks, they all fail. That's expected.** They're waiting for you to do the exercises. As you finish each one, the failures turn into passes. The lesson is done when the command shows only **passed**.

After each exercise, also run plain `pytest` (as in [Step 9](#step-9-run-the-checks-to-confirm-everything-works)). It should still say passed. If it now shows a failure, your change broke something that used to work, and the failure message tells you where.

### Lessons 5 and 7: install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/ and install it.
2. Open Docker Desktop and wait until it says it's running.
3. Keep Docker Desktop open whenever a lesson asks you to run a command that starts with `docker`.

---

## Problems and fixes

**"command not found: python3" (Mac) or "py is not recognized" (Windows)**
Python isn't installed, or the terminal was open before you installed it. Close the terminal, open a new one, and try again. On Windows, if it still fails, run the Python installer again, choose **Modify**, and make sure **Add Python to environment variables** is ticked.

**The version in Step 3 is 3.10 or lower (often `Python 3.9.6` on a Mac)**
Some computers come with an older Python already installed, and an open terminal may still be using it. Close the terminal, open a new one, and run Step 3 again. On a Mac, if it still shows the old version, try `python3.12 --version` (use the version number you downloaded); if that works, type `python3.12` wherever this guide says `python3`. On Windows, `py --version` uses the newest Python installed, so if it's still old, run the installer from Step 1 again.

**"running scripts is disabled on this system" (Windows, Step 7)**
Windows blocks this step by default. Run this once, type `Y` and press Enter when asked, then repeat Step 7:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**"No module named ...", "pytest: command not found" or "The term 'pytest' is not recognized"**
The workspace isn't turned on, or Step 8 ran before it was. Do [Step 7](#step-7-turn-the-workspace-on), check that `(.venv)` appears, then run [Step 8](#step-8-install-the-projects-tools) again.

**Step 8 fails with "Failed building wheel" or "Failed to build installable wheels"**
pip couldn't find a ready-made copy of a library for your Python, so it tried to build one from scratch. Check [Step 3](#step-3-check-that-python-is-installed):

- **If the second number is between 11 and 14,** your copy of the lessons is probably older than the current one. Download it again ([Step 4](#step-4-download-the-lessons)), then delete the `.venv` folder and redo Steps 5 to 8 in the new folder.
- **If it's higher than 14,** your Python is newer than this course supports. Install Python 3.14 as in [Step 1](#step-1-install-python), then delete the `.venv` folder and redo Steps 6 to 8.

**Step 9 shows "passed" but also a number of warnings**
Your `.venv` still has tools from an older copy of the lessons. Turn the workspace on ([Step 7](#step-7-turn-the-workspace-on)) and run [Step 8](#step-8-install-the-projects-tools) again; it updates them to the versions this copy expects. Then run Step 9 again.

**"No such file or directory" or "Cannot find path"**
The terminal is in the wrong folder. Do [Step 5](#step-5-go-to-the-onboarding-folder-in-the-terminal) again.

**"Address already in use" when starting the service**
The service is already running in another terminal window. Go to that window and press **Control + C**, or close it, then try again.

**The page at http://localhost:8000/docs won't load**
The service isn't running. Do [Step 10](#step-10-start-the-catalog-service-and-look-at-it) and leave that terminal window open while you use the page.

**Stuck on an exercise?**
Open the exercise's **Hint**. If that isn't enough, look in the `tests` folder for the file with the matching name (for example, `tests/test_models.py` for lesson 1); those working examples are usually one step away. Each exercise also has a **Show the answer** with the exact code and where it goes.

**`IndentationError` after pasting code**
Python uses the spaces at the start of each line to group code. Make the pasted lines start at the same position as the code they replace. VS Code's faint vertical guide lines help you line them up.

---

## What's in this folder

| Folder or file | What it holds |
|---|---|
| `catalog/` | The Catalog Service itself. You'll read and change this code. |
| `tests/` | Checks for the parts that already work. Keep these passing. |
| `exercises/` | Checks for your exercises, one file per lesson. |
| `modules/` | The seven lessons. |
| `bughunt/` | A small program with planted bugs, for lesson 6. |
| `fixtures/` | Sample data, for lesson 1. |
| `requirements.txt`, `requirements-dev.txt`, `constraints.txt` | The list of tools Step 8 installs, and their exact versions. |
| `Dockerfile`, `docker-compose.yml` | Instructions for Docker, for lessons 5 and 7. |

---

## Word list

| Word | Meaning |
|---|---|
| **API** | A set of addresses a program offers so other programs can ask it for things, such as "add this item" or "search for sales". |
| **Backend** | The part of an app that runs on a server and handles data, as opposed to the screens people see. |
| **Command** | A line of text you type into the terminal and run with Enter. |
| **Database** | A program that stores data in tables and finds it quickly. |
| **Docker** | A tool that packages a program with everything it needs, so it runs the same on any computer. |
| **Folder path** | The address of a folder, like `Downloads/PythonLearning-main/onboarding`. |
| **JSON** | A common text format for data, made of names and values in curly braces. |
| **Package / library** | Ready-made code other people wrote that a project uses. Step 8 installs these. |
| **Python** | The programming language the Catalog Service is written in. |
| **Server / service** | A program that keeps running and answers requests. |
| **Terminal** | A window for typing commands. |
| **Test / check** | A small program that runs part of the code and confirms it gives the right answer. |
| **Virtual environment (`.venv`)** | A private folder of tools for one project, so it doesn't affect anything else on your computer. |
