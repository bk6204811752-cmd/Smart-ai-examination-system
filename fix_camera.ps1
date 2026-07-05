$file = "src\pages\student\PracticeMockExam.tsx"
$content = Get-Content $file -Raw

# Replace handleSubmitExam
$oldPattern = [regex]::Escape("  const handleSubmitExam = async () => {
    if (window.confirm('Are you sure you want to submit the exam?')) {
      console.log('🛑 ========== EXAM SUBMISSION STARTED ==========")

$newCode = @"
  const handleSubmitExam = async () => {
    if (window.confirm('Are you sure you want to submit the exam?')) {
      await stopCamera()
      setExamEnded(true)
      calculateResults()
"@

# Find and replace until calculateResultsWithoutNavigation
$startIdx = $content.IndexOf("  const handleSubmitExam = async () => {")
$endIdx = $content.IndexOf("  const calculateResultsWithoutNavigation = () => {")

if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $before = $content.Substring(0, $startIdx)
    $after = $content.Substring($endIdx)
    
    $newContent = $before + $newCode + "`n    }`n  }`n`n" + $after
    
    # Replace calculateResultsWithoutNavigation with calculateResults
    $newContent = $newContent -replace "const calculateResultsWithoutNavigation", "const calculateResults"
    
    # Remove the legacy calculateResults function
    $newContent = $newContent -replace "  const calculateResults = \(\) => \{[^}]+calculateResultsWithoutNavigation\(\)[^}]+\}`n`n", ""
    
    Set-Content $file $newContent -NoNewline
    Write-Host "Fixed camera shutdown!"
} else {
    Write-Host "Pattern not found"
}
