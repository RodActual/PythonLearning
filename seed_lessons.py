import firebase_admin
from firebase_admin import credentials, firestore

# 1. Setup Connection
# Ensure this file is in the same folder as your key!
cred = credentials.Certificate("firebase_admin_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. Complete Curriculum Data
lessons = [
    {
        "id": "lesson-01",
        "title": "1. Introduction to Python",
        "steps": [
            {"type": "text", "content": "Python is a high-level, interpreted language created by Guido van Rossum in 1991. It focuses on code readability and simplicity."},
            {"type": "quiz", "question": "Python is an 'Interpreted' language. What does this mean?", "options": ["Code is converted to machine code before running", "Code is executed line-by-line by an interpreter", "Code only runs on web browsers"], "answer": "Code is executed line-by-line by an interpreter"}
        ]
    },
    {
        "id": "lesson-02",
        "title": "2. Variables and Data Types",
        "steps": [
            {"type": "text", "content": "Variables store data. Python has Dynamic Typing, meaning you don't have to declare the type (like 'int' or 'string') manually."},
            {"type": "quiz", "question": "What is the correct way to assign a value to a variable?", "options": ["x := 5", "int x = 5", "x = 5"], "answer": "x = 5"}
        ]
    },
    {
        "id": "lesson-03",
        "title": "3. Control Flow (If/Else)",
        "steps": [
            {"type": "text", "content": "Python uses indentation to define blocks of code. Use 'if', 'elif', and 'else' to control the logic flow."},
            {"type": "quiz", "question": "Which symbol is required at the end of an 'if' statement line?", "options": [";", ":", "!"], "answer": ":"}
        ]
    },
    {
        "id": "lesson-04",
        "title": "4. Loops (For/While)",
        "steps": [
            {"type": "text", "content": "Loops allow you to repeat code. 'for' loops are great for sequences; 'while' loops run as long as a condition is true."},
            {"type": "quiz", "question": "How do you loop through numbers 0 to 4?", "options": ["for x in range(5):", "for x from 0 to 4:", "while x < 4:"], "answer": "for x in range(5):"}
        ]
    },
    {
        "id": "lesson-05",
        "title": "5. Functions",
        "steps": [
            {"type": "text", "content": "Functions are reusable blocks of code. You define them using the 'def' keyword."},
            {"type": "quiz", "question": "Which keyword is used to send a value back from a function?", "options": ["send", "output", "return"], "answer": "return"}
        ]
    },
    {
        "id": "lesson-06",
        "title": "6. Lists and Tuples",
        "steps": [
            {"type": "text", "content": "Lists are ordered and changeable []. Tuples are ordered but unchangeable ()."},
            {"type": "quiz", "question": "Which method adds an item to the end of a list?", "options": ["add()", "append()", "insert()"], "answer": "append()"}
        ]
    },
    {
        "id": "lesson-07",
        "title": "7. Dictionaries and Sets",
        "steps": [
            {"type": "text", "content": "Dictionaries store data in Key:Value pairs. Sets are unordered collections of unique items."},
            {"type": "quiz", "question": "How do you access the value of a key 'name' in dictionary 'user'?", "options": ["user['name']", "user.name", "user(name)"], "answer": "user['name']"}
        ]
    },
    {
        "id": "lesson-08",
        "title": "8. Error Handling (Try/Except)",
        "steps": [
            {"type": "text", "content": "Use 'try' and 'except' blocks to handle errors gracefully without crashing your program."},
            {"type": "quiz", "question": "Which block always runs, regardless of whether an error occurred?", "options": ["catch", "finally", "else"], "answer": "finally"}
        ]
    },
    {
        "id": "lesson-09",
        "title": "9. Modules and Packages",
        "steps": [
            {"type": "text", "content": "Modules are .py files containing Python code. You bring them into your script using 'import'."},
            {"type": "quiz", "question": "How do you import only the 'sqrt' function from the 'math' module?", "options": ["import math.sqrt", "from math import sqrt", "get sqrt from math"], "answer": "from math import sqrt"}
        ]
    },
    {
        "id": "lesson-10",
        "title": "10. File I/O",
        "steps": [
            {"type": "text", "content": "Python can read and write files using the open() function. It is best practice to use the 'with' keyword."},
            {"type": "quiz", "question": "Which mode is used to write to a file (overwriting existing content)?", "options": ["'r'", "'a'", "'w'"], "answer": "'w'"}
        ]
    },
    {
        "id": "lesson-11",
        "title": "11. Classes and Objects (OOP)",
        "steps": [
            {"type": "text", "content": "Python is an object-oriented language. Classes are blueprints for creating objects."},
            {"type": "quiz", "question": "What is the name of the constructor method in a Python class?", "options": ["__init__", "constructor()", "new()"], "answer": "__init__"}
        ]
    },
    {
        "id": "lesson-12",
        "title": "12. Capstone: Building a Program",
        "steps": [
            {"type": "text", "content": "Time to combine everything! We will structure a 'Task Manager' using functions, loops, and file storage."},
            {"type": "quiz", "question": "Which of these is the best starting point for a complex program?", "options": ["Write all code in one file immediately", "Break the problem into small, testable functions", "Start with the most difficult feature first"], "answer": "Break the problem into small, testable functions"}
        ]
    }
]

def seed_data():
    print("🚀 Starting Firestore Seeding...")
    collection_name = "lessons"
    
    for lesson in lessons:
        lesson_id = lesson["id"]
        # .set() will create the doc if it doesn't exist, or overwrite if it does
        db.collection(collection_name).document(lesson_id).set(lesson)
        print(f"✅ Created: {lesson['title']}")
    
    print("\n✨ Success! 12 lessons are now live in your database.")

if __name__ == "__main__":
    seed_data()