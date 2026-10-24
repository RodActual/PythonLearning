"""Replace whole steps in a lesson file: python3 -I swap.py LESSON.py NEW_STEPS.py
NEW_STEPS.py holds a dict SWAP = {'old heading': '''T(...)/Q(...)/C(...) source'''}."""
import re, sys
path, new = sys.argv[1], sys.argv[2]
src = open(path).read()
swap = {}
exec(open(new).read(), {}, ns := {})
swap = ns['SWAP']
# Steps start at column 0 with T(, Q( or C(; the list ends with a line holding only ']'.
starts = [m.start() for m in re.finditer(r'^(?:T|Q|C)\(', src, re.M)]
ends = [m.start() for m in re.finditer(r'^\]', src, re.M)]
bounds = []
for s in starts:
    nxt = min([x for x in starts + ends if x > s])
    bounds.append((s, nxt))
out, last, used = [], 0, set()
for s, e in bounds:
    block = src[s:e]
    head = re.match(r'(?:T|Q|C)\("((?:[^"\\]|\\.)*)"', block)
    key = head.group(1) if head else None
    out.append(src[last:s])
    if key in swap:
        out.append(swap[key].strip('\n') + '\n')
        used.add(key)
    else:
        out.append(block)
    last = e
out.append(src[last:])
missing = set(swap) - used
assert not missing, f'not found: {missing}'
open(path, 'w').write(''.join(out))
print(f'swapped {len(used)} steps in {path}')
