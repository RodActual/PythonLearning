import firebase_admin
from firebase_admin import credentials, firestore

# 1. Setup Connection
# Ensure this file is in the same folder as your key!
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_admin_key.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Comprehensive Curriculum Data
lessons = [
    {
        "id": "lesson-01",
        "title": "1. Introduction to Python",
        "steps": [
            {
                "type": "text", 
                "heading": "What is Python?",
                "content": "Python is a high-level, interpreted programming language known for its simplicity and readability. It was created by Guido van Rossum and released in 1991. Unlike languages like C++ or Java, Python reads like English, making it perfect for beginners."
            },
            {
                "type": "quiz", 
                "question": "Which of these is a key feature of Python?", 
                "options": ["It requires manual memory management", "It is hard to read", "It emphasizes code readability"], 
                "answer": "It emphasizes code readability"
            },
            {
                "type": "text", 
                "heading": "Your First Program",
                "content": "In Python, printing text to the screen is the first thing most people learn. We use the built-in `print()` function.",
                "example_code": "print(\"Hello, World!\")"
            },
            {
                "type": "quiz", 
                "question": "What is the correct syntax to output text?", 
                "options": ["echo 'Hello'", "print('Hello')", "console.log('Hello')"], 
                "answer": "print('Hello')"
            },
            {
                "type": "text", 
                "heading": "Comments",
                "content": "Comments are lines of code that Python ignores. They are used to explain what your code does. In Python, a comment starts with the `#` symbol.",
                "example_code": "# This is a comment\nprint(\"This runs\") # This is also a comment"
            }
        ]
    },
    {
        "id": "lesson-02",
        "title": "2. Variables & Data Types",
        "steps": [
            {
                "type": "text", 
                "heading": "Variables",
                "content": "A variable is like a box that holds data. You don't need to declare the type; just assign a value using the `=` sign.",
                "example_code": "user_name = \"Alice\"\nuser_age = 25"
            },
            {
                "type": "quiz", 
                "question": "Which variable name is invalid in Python?", 
                "options": ["my_var", "2variable", "_variable"], 
                "answer": "2variable"
            },
            {
                "type": "text", 
                "heading": "Strings and Integers",
                "content": "Text is called a 'String' (str) and must be inside quotes. Whole numbers are 'Integers' (int).",
                "example_code": "name = \"Python\"  # String\nversion = 3       # Integer"
            },
            {
                "type": "text", 
                "heading": "Floats and Booleans",
                "content": "Decimal numbers are called 'Floats'. True/False values are called 'Booleans'.",
                "example_code": "price = 19.99     # Float\nis_active = True  # Boolean"
            },
            {
                "type": "quiz", 
                "question": "What is the data type of the value 3.14?", 
                "options": ["Integer", "Float", "String"], 
                "answer": "Float"
            }
        ]
    },
    {
        "id": "lesson-03",
        "title": "3. Control Flow (If/Else)",
        "steps": [
            {
                "type": "text", 
                "heading": "If Statements",
                "content": "Control flow allows your program to make decisions. The `if` statement runs code only if a condition is true. Python uses **indentation** (whitespace) to define the block of code.",
                "example_code": "if age >= 18:\n    print(\"You are an adult.\")"
            },
            {
                "type": "quiz", 
                "question": "What defines a block of code in Python?", 
                "options": ["Curly braces {}", "Indentation", "Semicolons ;"], 
                "answer": "Indentation"
            },
            {
                "type": "text", 
                "heading": "Else and Elif",
                "content": "Use `else` to define what happens if the condition is false. Use `elif` (else if) to check multiple conditions.",
                "example_code": "if score > 90:\n    print(\"A\")\nelif score > 80:\n    print(\"B\")\nelse:\n    print(\"C\")"
            },
            {
                "type": "quiz", 
                "question": "Which keyword handles the 'otherwise' condition?", 
                "options": ["otherwise", "else", "stop"], 
                "answer": "else"
            }
        ]
    },
    {
        "id": "lesson-04",
        "title": "4. Loops (Repetition)",
        "steps": [
            {
                "type": "text", 
                "heading": "For Loops",
                "content": "A `for` loop is used to iterate over a sequence (like a list or a range of numbers).",
                "example_code": "for i in range(5):\n    print(i)\n# Prints 0, 1, 2, 3, 4"
            },
            {
                "type": "quiz", 
                "question": "What does range(3) produce?", 
                "options": ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3"], 
                "answer": "0, 1, 2"
            },
            {
                "type": "text", 
                "heading": "While Loops",
                "content": "A `while` loop runs as long as a specific condition is True. Be careful not to create infinite loops!",
                "example_code": "count = 0\nwhile count < 3:\n    print(count)\n    count += 1"
            },
            {
                "type": "text", 
                "heading": "Break and Continue",
                "content": "`break` stops the loop entirely. `continue` skips the current iteration and jumps to the next one.",
                "example_code": "for x in range(10):\n    if x == 5:\n        break\n    print(x)"
            }
        ]
    },
    {
        "id": "lesson-05",
        "title": "5. Functions",
        "steps": [
            {
                "type": "text", 
                "heading": "Defining Functions",
                "content": "Functions are reusable blocks of code. Use the `def` keyword to create one.",
                "example_code": "def greet():\n    print(\"Hello!\")"
            },
            {
                "type": "text", 
                "heading": "Arguments",
                "content": "You can pass data into functions using arguments (parameters).",
                "example_code": "def greet(name):\n    print(f\"Hello, {name}!\")\n\ngreet(\"Alice\")"
            },
            {
                "type": "text", 
                "heading": "Return Values",
                "content": "Functions can send data back to the caller using the `return` keyword.",
                "example_code": "def add(a, b):\n    return a + b\n\nresult = add(5, 3)"
            },
            {
                "type": "quiz", 
                "question": "What keyword sends data back from a function?", 
                "options": ["output", "return", "send"], 
                "answer": "return"
            }
        ]
    },
    {
        "id": "lesson-06",
        "title": "6. Lists",
        "steps": [
            {
                "type": "text", 
                "heading": "Creating Lists",
                "content": "A list is an ordered collection of items. Lists are created using square brackets `[]`.",
                "example_code": "fruits = [\"apple\", \"banana\", \"cherry\"]"
            },
            {
                "type": "text", 
                "heading": "Accessing Items",
                "content": "You access items by their index. Python uses 0-based indexing.",
                "example_code": "print(fruits[0]) # apple\nprint(fruits[1]) # banana"
            },
            {
                "type": "quiz", 
                "question": "If my_list = ['a', 'b', 'c'], what is my_list[1]?", 
                "options": ["a", "b", "c"], 
                "answer": "b"
            },
            {
                "type": "text", 
                "heading": "Modifying Lists",
                "content": "Lists are mutable (changeable). You can add items with `.append()` and remove them with `.pop()`.",
                "example_code": "fruits.append(\"orange\")\nfruits.remove(\"banana\")"
            }
        ]
    },
    {
        "id": "lesson-07",
        "title": "7. Dictionaries",
        "steps": [
            {
                "type": "text", 
                "heading": "Key-Value Pairs",
                "content": "Dictionaries store data in `key: value` pairs. They are defined with curly braces `{}`.",
                "example_code": "user = {\n  \"name\": \"John\",\n  \"age\": 30\n}"
            },
            {
                "type": "text", 
                "heading": "Accessing Values",
                "content": "You access values by referring to their key name.",
                "example_code": "print(user[\"name\"]) # Prints John"
            },
            {
                "type": "quiz", 
                "question": "How do you get the 'age' from 'user'?", 
                "options": ["user.get(age)", "user['age']", "user(age)"], 
                "answer": "user['age']"
            },
            {
                "type": "text", 
                "heading": "Adding Items",
                "content": "To add a new item, just assign a value to a new key.",
                "example_code": "user[\"city\"] = \"New York\""
            }
        ]
    },
    {
        "id": "lesson-08",
        "title": "8. Error Handling",
        "steps": [
            {
                "type": "text", 
                "heading": "Try and Except",
                "content": "Errors crash your program. To prevent this, use `try` and `except` blocks to catch errors.",
                "example_code": "try:\n    print(10 / 0)\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")"
            },
            {
                "type": "quiz", 
                "question": "Which block runs if an error occurs in the 'try' block?", 
                "options": ["else", "except", "catch"], 
                "answer": "except"
            },
            {
                "type": "text", 
                "heading": "Finally",
                "content": "The `finally` block lets you execute code, regardless of the result of the try/except blocks.",
                "example_code": "try:\n    f = open(\"demofile.txt\")\nfinally:\n    f.close()"
            }
        ]
    },
    {
        "id": "lesson-09",
        "title": "9. Modules",
        "steps": [
            {
                "type": "text", 
                "heading": "Importing Modules",
                "content": "A module is a file containing a set of functions you can include in your application. Use the `import` keyword.",
                "example_code": "import math\nprint(math.sqrt(16))"
            },
            {
                "type": "text", 
                "heading": "From ... Import",
                "content": "You can import specific parts of a module to avoid typing the module name every time.",
                "example_code": "from random import randint\nprint(randint(1, 10))"
            },
            {
                "type": "quiz", 
                "question": "Which keyword brings an external library into your code?", 
                "options": ["include", "using", "import"], 
                "answer": "import"
            }
        ]
    },
    {
        "id": "lesson-10",
        "title": "10. File I/O",
        "steps": [
            {
                "type": "text", 
                "heading": "Opening Files",
                "content": "The `open()` function takes two parameters; filename, and mode. Modes: 'r' (read), 'w' (write), 'a' (append).",
                "example_code": "f = open(\"test.txt\", \"w\")"
            },
            {
                "type": "text", 
                "heading": "The 'With' Statement",
                "content": "It is best practice to use `with` when opening files. It automatically closes the file for you, even if an error occurs.",
                "example_code": "with open(\"test.txt\", \"r\") as f:\n    print(f.read())"
            },
            {
                "type": "quiz", 
                "question": "Which mode should you use to Write to a file?", 
                "options": ["'r'", "'w'", "'x'"], 
                "answer": "'w'"
            }
        ]
    },
    {
        "id": "lesson-11",
        "title": "11. Classes & OOP",
        "steps": [
            {
                "type": "text", 
                "heading": "Classes and Objects",
                "content": "Python is an Object Oriented language. A Class is a blueprint for creating objects.",
                "example_code": "class Dog:\n    def bark(self):\n        print(\"Woof!\")"
            },
            {
                "type": "text", 
                "heading": "The __init__ Function",
                "content": "All classes have a function called `__init__()`, which is always executed when the class is being initiated (constructed).",
                "example_code": "class Person:\n  def __init__(self, name):\n    self.name = name"
            },
            {
                "type": "quiz", 
                "question": "What is 'self' in Python classes?", 
                "options": ["A keyword for loops", "A reference to the current instance of the class", "A global variable"], 
                "answer": "A reference to the current instance of the class"
            }
        ]
    },
    {
        "id": "lesson-12",
        "title": "12. Capstone Project",
        "steps": [
            {
                "type": "text", 
                "heading": "Project: Inventory System",
                "content": "Congratulations on making it to the end! We will combine variables, lists, dicts, and loops to make a simple inventory system."
            },
            {
                "type": "text", 
                "heading": "Step 1: Data Structure",
                "content": "We need a way to store products. A list of dictionaries is perfect.",
                "example_code": "inventory = [\n  {\"id\": 1, \"name\": \"Apple\", \"qty\": 10},\n  {\"id\": 2, \"name\": \"Banana\", \"qty\": 5}\n]"
            },
            {
                "type": "text", 
                "heading": "Step 2: The Function",
                "content": "Let's make a function to display stock.",
                "example_code": "def show_inventory():\n    for item in inventory:\n        print(f\"{item['name']}: {item['qty']}\")"
            },
            {
                "type": "quiz", 
                "question": "If we wanted to sell an Apple, how would we decrease the quantity?", 
                "options": ["inventory[0]['qty'] -= 1", "inventory['Apple'] = 9", "inventory.remove('Apple')"], 
                "answer": "inventory[0]['qty'] -= 1"
            },
            {
                "type": "text", 
                "heading": "Completion",
                "content": "You have completed the Python Learning Path! You now understand the core building blocks of programming. Happy coding!"
            }
        ]
    }
]

def seed_data():
    print("🚀 Seeding 12 Comprehensive Lessons...")
    for lesson in lessons:
        lesson_id = lesson["id"]
        # .set() overwrites the document, ensuring old data is replaced
        db.collection("lessons").document(lesson_id).set(lesson)
        print(f"✅ Updated: {lesson['title']}")
    
    print("\n✨ Database successfully updated with expanded curriculum!")

if __name__ == "__main__":
    seed_data()