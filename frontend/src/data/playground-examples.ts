// Starter programs for the Playground. Each one runs as-is.
export const BLANK = "# Write any Python you like, then press Run.\nprint('Hello from the playground!')\n";

export const EXAMPLES: { name: string; code: string }[] = [
  { name: 'Hello, world', code: BLANK },
  {
    name: 'FizzBuzz (loops and if)',
    code: "for n in range(1, 16):\n    if n % 15 == 0:\n        print('FizzBuzz')\n    elif n % 3 == 0:\n        print('Fizz')\n    elif n % 5 == 0:\n        print('Buzz')\n    else:\n        print(n)\n",
  },
  {
    name: 'Word counter (dictionaries)',
    code: "text = 'the quick brown fox jumps over the lazy dog the end'\ncounts = {}\nfor word in text.split():\n    counts[word] = counts.get(word, 0) + 1\n\nfor word, n in sorted(counts.items(), key=lambda kv: -kv[1])[:3]:\n    print(f'{word}: {n}')\n",
  },
  {
    name: 'Bank account (classes)',
    code: "class Account:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError('insufficient funds')\n        self.balance -= amount\n\n    def __str__(self):\n        return f'{self.owner}: ${self.balance:.2f}'\n\nacct = Account('Ada', 100)\nacct.deposit(25)\nacct.withdraw(40)\nprint(acct)\n",
  },
  {
    name: 'Save and load JSON (files)',
    code: "import json\n\ntasks = [{'title': 'Learn Python', 'done': True}, {'title': 'Build something', 'done': False}]\nwith open('tasks.json', 'w') as f:\n    json.dump(tasks, f, indent=2)\n\nwith open('tasks.json') as f:\n    for task in json.load(f):\n        mark = 'x' if task['done'] else ' '\n        print(f\"[{mark}] {task['title']}\")\n",
  },
  {
    name: 'Days until a date (datetime)',
    code: "from datetime import date\n\ntoday = date.today()\ntarget = date(today.year, 12, 25)\nif target < today:\n    target = target.replace(year=today.year + 1)\ndays = (target - today).days\nprint(f'{days} days until {target:%B %d, %Y}')\n",
  },
  {
    name: 'Fibonacci (generators)',
    code: "def fib():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b\n\ngen = fib()\nprint([next(gen) for _ in range(12)])\n",
  },
];

