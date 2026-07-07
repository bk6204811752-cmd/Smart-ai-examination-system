import json

d = json.load(open('eslint_output4.json', 'r', encoding='utf-8-sig'))
error_files = {}
warn_files = {}
for f in d:
    for m in f.get('messages', []):
        fname = f['filePath'].split('Ai-Exam')[-1].lstrip('/\\')
        if m['severity'] == 2:
            error_files.setdefault(fname, []).append(m)
        else:
            warn_files.setdefault(fname, []).append(m)

total_e = sum(len(v) for v in error_files.values())
total_w = sum(len(v) for v in warn_files.values())
print(f'Total: {total_e} errors, {total_w} warnings')

print('\n=== ERRORS ===')
for fn, msgs in sorted(error_files.items(), key=lambda x: -len(x[1])):
    print(f'{fn} ({len(msgs)}):')
    for m in msgs:
        print(f'  L{m["line"]}: [{m["ruleId"]}] {m["message"][:100]}')

print('\n=== WARNINGS ===')
for fn, msgs in sorted(warn_files.items(), key=lambda x: -len(x[1])):
    print(f'{fn} ({len(msgs)}):')
    for m in msgs[:3]:
        print(f'  L{m["line"]}: [{m["ruleId"]}] {m["message"][:100]}')
    if len(msgs) > 3:
        print(f'  ... and {len(msgs)-3} more')
