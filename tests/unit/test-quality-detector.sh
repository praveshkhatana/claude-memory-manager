#!/bin/bash
# Unit tests for quality detector script

SCRIPT_DIR="/path/to/claude/plugins/claude-memory-manager/hooks/scripts"
DETECTOR="$SCRIPT_DIR/quality-detector.sh"

echo "=== Quality Detector Unit Tests ==="
echo ""

# Test 1: Technical content detection
echo "Test 1: Technical content detection"
# Using technical terms without problem-solving keywords to avoid false positive
tech_content='const api = axios.create(); async function fetchData() { const response = await axios.get("/api/users"); return response.data; }'
result=$(bash "$DETECTOR" "$tech_content")
echo "  Result: $result"
# Expected: store|skip|technical-content
if [[ "$result" =~ "store" ]] && [[ "$result" =~ "technical-content" ]]; then
  echo "  ✓ PASS: Technical content detected"
else
  echo "  ✗ FAIL: Expected 'store|skip|technical-content'"
  exit 1
fi
echo ""

# Test 2: Social content detection
echo "Test 2: Social content detection"
social_content='Hello, how are you? Thanks for your help!'
result=$(bash "$DETECTOR" "$social_content")
echo "  Result: $result"
# Expected: skip|skip|social|no-technical-content
if [[ "$result" =~ "skip" ]] && [[ "$result" =~ "social" ]]; then
  echo "  ✓ PASS: Social content skipped"
else
  echo "  ✗ FAIL: Expected 'skip|skip|social|no-technical-content'"
  exit 1
fi
echo ""

# Test 3: Problem-solving detection
echo "Test 3: Problem-solving detection"
# Note: Removed "approach" keyword to avoid decision-making detection
problem_content="-- User: We have an issue with the data.
-- Assistant: I see the problem. We tried the old solution but it is broken.
-- User: We need to fix this by using a new solution.
-- Assistant: Good idea. Let me improve the code."
result=$(bash "$DETECTOR" "$problem_content")
echo "  Result: $result"
# Expected: store|skip|problem-solving
if [[ "$result" =~ "store" ]] && [[ "$result" =~ "problem-solving" ]]; then
  echo "  ✓ PASS: Problem-solving detected"
else
  echo "  ✗ FAIL: Expected 'store|skip|problem-solving'"
  exit 1
fi
echo ""

# Test 4: Decision-making detection
echo "Test 4: Decision-making detection"
decision_content="-- User: We need to decide on the state management approach.
-- Assistant: We should use Redux for better time-travel debugging and middleware support.
-- User: Good choice. Let me use Redux instead of Context API.
-- Assistant: Perfect. I'll implement Redux for middleware support"
result=$(bash "$DETECTOR" "$decision_content")
echo "  Result: $result"
# Expected: store|skip|decision-making
if [[ $result =~ store ]] && [[ $result =~ decision-making ]]; then
  echo "  ✓ PASS: Decision-making detected"
else
  echo "  ✗ FAIL: Expected 'store|skip|decision-making'"
  exit 1
fi
echo ""

# Test 5: Short content handling
echo "Test 5: Short content handling"
short_content="Hi"
result=$(bash "$DETECTOR" "$short_content")
echo "  Result: $result"
# Expected: skip (too short)
if [[ "$result" =~ "skip" ]]; then
  echo "  ✓ PASS: Short content skipped"
else
  echo "  ✗ FAIL: Expected 'skip'"
  exit 1
fi
echo ""

# Test 6: User pattern detection
echo "Test 6: User pattern detection"
user_content="-- User: I prefer one bundled PR over many small ones, and I like to keep all related changes in a single bundled PR rather than many small ones"
result=$(bash "$DETECTOR" "$user_content")
echo "  Result: $result"
# Expected: user|user-prefer (detect_user_patterns returns memory_type|tags)
if [[ "$result" == "user|user-prefer" ]]; then
  echo "  ✓ PASS: User pattern detected"
else
  echo "  ✗ FAIL: Expected 'user|user-prefer'"
  exit 1
fi
echo ""

# Test 7: Feedback pattern detection
echo "Test 7: Feedback pattern detection"
feedback_content="Don't mock the database, it's a bad practice and we shouldn't do it in production or production environments"
result=$(bash "$DETECTOR" "$feedback_content")
echo "  Result: $result"
# Expected: feedback|feedback|avoid (memory_type=feedback, tags=feedback|avoid)
if [[ $result == "feedback|feedback|avoid" ]]; then
  echo "  ✓ PASS: Feedback pattern detected"
else
  echo "  ✗ FAIL: Expected 'feedback|feedback|avoid'"
  exit 1
fi
echo ""

echo "✅ All quality detector tests passed!"