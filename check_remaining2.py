import json
d = json.load(open('eslint_output6.json', 'r', encoding='utf-8-sig'))
for f in d:
    for m in f.get('messages', []):
        if m['severity'] == 2:
            fn = f['filePath'].split('Ai-Exam')[-1].lstrip('/\\')
            print(f'{fn}:L{m["line"]} - {m["ruleId"]}: {m["message"][:100]}')
