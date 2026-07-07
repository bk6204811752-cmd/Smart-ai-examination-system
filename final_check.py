import json
d = json.load(open('eslint_output7.json', 'r', encoding='utf-8-sig'))
count = 0
for f in d:
    for m in f.get('messages', []):
        if m['severity'] == 2:
            fn = f['filePath'].split('Ai-Exam')[-1].lstrip('/\\')
            print(f'{fn}:L{m["line"]} - {m["ruleId"]}: {m["message"][:120]}')
            count += 1
print(f'\nTotal errors: {count}')
