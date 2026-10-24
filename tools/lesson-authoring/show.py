import re, sys
path=sys.argv[1]; heads=sys.argv[2:]
src=open(path).read()
starts=[m.start() for m in re.finditer(r'^(?:T|Q|C)\(', src, re.M)]
ends=[m.start() for m in re.finditer(r'^\]', src, re.M)]
for s in starts:
    e=min(x for x in starts+ends if x>s)
    b=src[s:e]
    m=re.match(r'(?:T|Q|C)\("((?:[^"\\]|\\.)*)"', b)
    if m and m.group(1) in heads: print(b)
