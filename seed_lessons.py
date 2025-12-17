import firebase_admin
from firebase_admin import credentials, firestore

# 1. Setup Connection
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_admin_key.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Deep Dive Part 4: Lessons 10, 11, and 12
lessons = [
    # ================= LESSON 10: FILE I/O (13 Steps) =================
    {
        "id": "lesson-10",
        "title": "10. File I/O",
        "steps": [
            { "type": "text", "heading": "Reading & Writing", "content": "Programs need to save data. Python uses the `open()` function to interact with files." },
            { "type": "quiz", "question": "Practice 1: What does 'I/O' stand for?", "options": ["Input/Output", "Internal/Optional", "Integer/Object"], "answer": "Input/Output" },

            { "type": "text", "heading": "Writing to Files", "content": "To create or overwrite a file, use mode `'w'` (write). Use `.write()` to put text inside." },
            { "type": "code", "heading": "Practice 2: Coding", "instruction": "Open 'test.txt' in write mode and write 'Hello' to it.", "initial_code": "f = open('test.txt', 'w')\n# Write 'Hello' here\nf.write('Hello')\nf.close()\n\n# Verification (Do not change)\nprint(open('test.txt').read())", "expected_output": "Hello" },

            { "type": "text", "heading": "Reading Files", "content": "Use mode `'r'` (read) to open a file. Use `.read()` to get the contents." },
            { "type": "code", "heading": "Practice 3: Coding", "instruction": "Read the file 'note.txt' and print its content.", "initial_code": "# Setup (Creating the file for you)\nwith open('note.txt', 'w') as f: f.write('Secret Message')\n\n# Your Code:\nf = open('note.txt', 'r')\nprint(f.read())\nf.close()", "expected_output": "Secret Message" },

            { "type": "quiz", "question": "Practice 4: What happens if you open a non-existent file in 'r' mode?", "options": ["It creates the file", "FileNotFoundError", "It returns None"], "answer": "FileNotFoundError" },

            { "type": "text", "heading": "The 'With' Statement", "content": "Manually closing files with `.close()` is annoying. The `with` statement closes the file automatically." },
            { "type": "code", "heading": "Practice 5: Coding", "instruction": "Rewrite this using 'with'.", "initial_code": "# OLD WAY:\n# f = open('log.txt', 'w')\n# f.write('Log Entry')\n# f.close()\n\n# NEW WAY:\nwith open('log.txt', 'w') as f:\n    f.write('Log Entry')\n\nprint(open('log.txt').read())", "expected_output": "Log Entry" },

            { "type": "text", "heading": "Appending", "content": "Mode `'w'` deletes existing content. Mode `'a'` (append) adds to the end of the file." },
            { "type": "code", "heading": "Practice 6: Coding", "instruction": "Append ' World' to the existing file.", "initial_code": "# Setup\nwith open('greet.txt', 'w') as f: f.write('Hello')\n\n# Your Code (Use mode 'a')\nwith open('greet.txt', 'a') as f:\n    f.write(' World')\n\nprint(open('greet.txt').read())", "expected_output": "Hello World" },

            { "type": "quiz", "question": "Practice 7: Which mode allows reading AND writing?", "options": ["'r+'", "'rw'", "'x'"], "answer": "'r+'" },

            { "type": "text", "heading": "Readlines", "content": "You can read a file line-by-line using `.readlines()` or by looping over the file object." },
            { "type": "code", "heading": "Practice 8: Coding", "instruction": "Loop through the file and print each line.", "initial_code": "# Setup\nwith open('list.txt', 'w') as f: f.write('Line 1\\nLine 2')\n\nwith open('list.txt', 'r') as f:\n    for line in f:\n        print(line.strip())", "expected_output": "Line 1\nLine 2" },

            { "type": "quiz", "question": "Final Quiz: Why is 'with' preferred over manual open/close?", "options": ["It runs faster", "It prevents file corruption errors", "It uses less memory"], "answer": "It prevents file corruption errors" }
        ]
    },

    # ================= LESSON 11: CLASSES & OOP (14 Steps) =================
    {
        "id": "lesson-11",
        "title": "11. Classes & OOP",
        "steps": [
            { "type": "text", "heading": "Object Oriented Programming", "content": "Everything in Python is an Object. OOP allows us to create our own data types called **Classes**." },
            { "type": "quiz", "question": "Practice 1: A Class is like a...?", "options": ["Variable", "Blueprint", "List"], "answer": "Blueprint" },

            { "type": "text", "heading": "Defining a Class", "content": "Use the `class` keyword. By convention, class names are Capitalized." },
            { "type": "code", "heading": "Practice 2: Coding", "instruction": "Define a class named 'Cat' with a placeholder 'pass'.", "initial_code": "class Cat:\n    pass\n\nprint(Cat)", "expected_output": "<class '__main__.Cat'>" },

            { "type": "text", "heading": "Creating Objects", "content": "An **Object** is an instance of a Class. You create one by calling the class like a function." },
            { "type": "code", "heading": "Practice 3: Coding", "instruction": "Create an instance of Cat assigned to the variable 'kitty'.", "initial_code": "class Cat:\n    pass\n\nkitty = Cat()\nprint(type(kitty))", "expected_output": "<class '__main__.Cat'>" },

            { "type": "text", "heading": "The __init__ Method", "content": "This special method sets up the object when it is created. It's often called the Constructor." },
            { "type": "code", "heading": "Practice 4: Coding", "instruction": "Finish __init__ to set self.name = name.", "initial_code": "class Person:\n    def __init__(self, name):\n        self.name = name\n\np = Person('Alice')\nprint(p.name)", "expected_output": "Alice" },

            { "type": "quiz", "question": "Practice 5: What is the first parameter of every method in a class?", "options": ["this", "self", "init"], "answer": "self" },

            { "type": "text", "heading": "Methods", "content": "Methods are just functions that belong to an object." },
            { "type": "code", "heading": "Practice 6: Coding", "instruction": "Add a method 'speak' that prints 'Woof'.", "initial_code": "class Dog:\n    def speak(self):\n        print('Woof')\n\nd = Dog()\nd.speak()", "expected_output": "Woof" },

            { "type": "text", "heading": "Attributes", "content": "Variables inside an object are called Attributes. You access them using dot notation (`object.attribute`)." },
            { "type": "code", "heading": "Practice 7: Coding", "instruction": "Create a Car with color 'Red'. Print the color.", "initial_code": "class Car:\n    def __init__(self, color):\n        self.color = color\n\nc = Car('Red')\nprint(c.color)", "expected_output": "Red" },

            { "type": "quiz", "question": "Practice 8: Can different objects of the same class have different attribute values?", "options": ["Yes", "No, they share values"], "answer": "Yes" },

            { "type": "code", "heading": "Practice 9: Coding", "instruction": "Create a 'Counter' class. The 'increment' method should add 1 to 'self.count'.", "initial_code": "class Counter:\n    def __init__(self):\n        self.count = 0\n    \n    def increment(self):\n        self.count += 1\n\nc = Counter()\nc.increment()\nprint(c.count)", "expected_output": "1" },

            { "type": "quiz", "question": "Final Quiz: 'self' refers to...", "options": ["The Class itself", "The specific object instance", "The global scope"], "answer": "The specific object instance" }
        ]
    },

    # ================= LESSON 12: CAPSTONE (10 Steps) =================
    {
        "id": "lesson-12",
        "title": "12. Capstone: Inventory App",
        "steps": [
            { "type": "text", "heading": "Final Project", "content": "Welcome to the finish line! We will build a **Product Inventory System** using Classes, Lists, and Dictionaries." },

            { "type": "text", "heading": "Step 1: The Product Class", "content": "First, we need a blueprint for a Product. It should have a name, price, and quantity." },
            { "type": "code", "heading": "Task 1: Define Product", "instruction": "Create a Product class with __init__ that stores name, price, and qty.", "initial_code": "class Product:\n    def __init__(self, name, price, qty):\n        self.name = name\n        self.price = price\n        self.qty = qty\n\np = Product('Apple', 0.5, 10)\nprint(p.name)", "expected_output": "Apple" },

            { "type": "text", "heading": "Step 2: Methods", "content": "We need to update stock when we make a sale." },
            { "type": "code", "heading": "Task 2: Sell Method", "instruction": "Add a 'sell(amount)' method that subtracts amount from self.qty.", "initial_code": "class Product:\n    def __init__(self, name, qty):\n        self.name = name\n        self.qty = qty\n    \n    def sell(self, amount):\n        self.qty -= amount\n\np = Product('Apple', 10)\np.sell(3)\nprint(p.qty)", "expected_output": "7" },

            { "type": "text", "heading": "Step 3: The Inventory", "content": "Now we need a place to store multiple products. A list works perfectly." },
            { "type": "code", "heading": "Task 3: Inventory List", "instruction": "Create a list containing two Product objects: 'Laptop' (Qty 5) and 'Phone' (Qty 10). Print the name of the first one.", "initial_code": "class Product:\n    def __init__(self, name, qty):\n        self.name = name\n        self.qty = qty\n\n# Create list here\ninventory = [\n    Product('Laptop', 5),\n    Product('Phone', 10)\n]\n\nprint(inventory[0].name)", "expected_output": "Laptop" },

            { "type": "text", "heading": "Step 4: Managing Inventory", "content": "Let's make a function to calculate the total value of our stock." },
            { "type": "code", "heading": "Task 4: Total Value", "instruction": "Loop through the inventory. Multiply price * qty for each item and sum them up.", "initial_code": "class Product:\n    def __init__(self, price, qty):\n        self.price = price\n        self.qty = qty\n\ninventory = [\n    Product(100, 2),  # $200 total\n    Product(50, 4)    # $200 total\n]\n\ntotal_value = 0\nfor item in inventory:\n    total_value += item.price * item.qty\n\nprint(total_value)", "expected_output": "400" },

            { "type": "text", "heading": "Step 5: Putting it together", "content": "You have just combined OOP, Lists, Loops, and Math. This is the foundation of almost every software application." },

            { "type": "code", "heading": "Final Exam", "instruction": "Fix the bug! The loop should print the name of items with Qty < 5 (Low Stock).", "initial_code": "class Product:\n    def __init__(self, name, qty):\n        self.name = name\n        self.qty = qty\n\ninventory = [\n    Product('Paper', 50),\n    Product('Ink', 2)\n]\n\nfor item in inventory:\n    if item.qty < 5:\n        print(item.name)", "expected_output": "Ink" },

            { "type": "quiz", "question": "Course Completion: How do you feel about Python?", "options": ["I'm ready to learn more!", "It's confusing but fun", "I'm a pro now"], "answer": "I'm ready to learn more!" }
        ]
    }
]

def seed_data():
    print("🚀 Seeding Deep Dive Part 4 (Lessons 10-12)...")
    for lesson in lessons:
        lesson_id = lesson["id"]
        db.collection("lessons").document(lesson_id).set(lesson)
        print(f"✅ Updated: {lesson['title']}")
    
    print("\n✨ CURRICULUM COMPLETE! All 12 lessons are now live.")

if __name__ == "__main__":
    seed_data()