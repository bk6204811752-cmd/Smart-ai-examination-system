files = {
    r'C:\Users\basan\OneDrive\Desktop\Ai-Exam\src\pages\student\ExamPage.tsx': [342, 389, 730],
    r'C:\Users\basan\OneDrive\Desktop\Ai-Exam\src\utils\proctoringEngine.ts': [331, 413],
    r'C:\Users\basan\OneDrive\Desktop\Ai-Exam\src\pages\student\PracticeMockExam.tsx': [545],
    r'C:\Users\basan\OneDrive\Desktop\Ai-Exam\src\pages\student\PreExamVerification.tsx': [1069],
    r'C:\Users\basan\OneDrive\Desktop\Ai-Exam\src\lib\aiInsights.ts': [437],
}

for fpath, lines_to_fix in files.items():
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    changed = False
    for line_num in lines_to_fix:
        idx = line_num - 1
        stripped = lines[idx].lstrip()
        if stripped.startswith(';('):
            # Find position of first non-whitespace char
            pos = len(lines[idx]) - len(stripped)
            lines[idx] = lines[idx][:pos] + stripped[1:]  # Remove leading ;
            changed = True
            print(f'Fixed {fpath}:{line_num}')

    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
