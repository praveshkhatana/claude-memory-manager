#!/bin/bash
# Quality Detector Script
# Analyzes conversation content to determine if it's worth storing

# Configuration
CHAR_LIMIT=10000
MESSAGE_LIMIT=50
MIN_CONTENT_LENGTH=100
MIN_MESSAGES_EXCHANGE=3

# Sample content from log file
sample_content() {
  local log_file="/tmp/claude-conversation.log"
  local content=""

  if [[ -f "$log_file" ]]; then
    content=$(tail -n $MESSAGE_LIMIT "$log_file" 2>/dev/null || echo "")
  fi

  echo "$content"
}

# Detect technical content
detect_tech_content() {
  local text="$1"
  local tech_keywords=(
    "API" "function" "component" "service" "module" "import" "export"
    "const" "let" "var" "class" "interface" "type" "enum" "async" "await"
    "Promise" "Promise.all" "fetch" "axios" "express" "react" "vue"
    "angular" "angularjs" "node" "npm" "yarn" "webpack" "vite" "next"
    "nextjs" "nuxt" "nuxtjs" "django" "flask" "fastapi" "gorm" "sequelize"
    "prisma" "typeorm" "mongodb" "postgresql" "mysql" "sqlite" "redis"
    "cache" "buffer" "stream" "event" "emit" "on" "once"
    "subscribe" "unsubscribe" "middleware" "controller" "route" "router"
    "path" "url" "query" "params" "body" "request" "response" "status"
    "json" "xml" "yaml" "markdown" "html" "css" "scss" "less"
    "styled" "styled-components" "emotion" "jss" "styletron"
    "tailwind" "material-ui" "antd" "chakra-ui" "nextui"
    "theme" "color" "font" "typography" "spacing" "padding"
    "margin" "border" "radius" "shadow" "elevation" "z-index"
    "position" "flex" "grid" "layout"
  )

  for keyword in "${tech_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "1"
      return 0
    fi
  done

  echo "0"
  return 1
}

# Detect problem-solving patterns
detect_problem_solving() {
  local text="$1"
  local problem_keywords=(
    "fix" "resolve" "solve" "debug" "troubleshoot"
    "error" "exception" "crash" "fail" "broken"
    "not working" "doesn't work" "issue" "problem"
    "bug" "improve" "optimize" "refactor" "rewrite"
    "change" "modify" "add" "remove" "delete"
    "rename" "update" "upgrade" "downgrade"
    "test" "testing" "unit" "integration" "e2e"
    "end-to-end" "coverage" "should" "must" "require"
  )

  for keyword in "${problem_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "1"
      return 0
    fi
  done

  echo "0"
  return 1
}

# Detect decision-making patterns
detect_decision_making() {
  local text="$1"
  local decision_keywords=(
    "decided" "chose" "preferred" "instead" "rather"
    "better" "best" "optimal"
    "choice" "decision" "approach" "method" "strategy" "technique"
  )

  for keyword in "${decision_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "1"
      return 0
    fi
  done

  echo "0"
  return 1
}

# Detect user/feedback patterns
detect_user_patterns() {
  local text="$1"
  local memory_type="user"
  local tags=()

  # Feedback patterns
  if [[ "$text" =~ "don't" ]] || [[ "$text" =~ "Don't" ]]; then
    memory_type="feedback"
    tags+=("feedback" "avoid")
  fi

  if [[ "$text" =~ "not" ]] && [[ "$text" =~ "mock" ]]; then
    memory_type="feedback"
    tags+=("feedback" "avoid-mock")
  fi

  if [[ "$text" =~ "exactly" ]] || [[ "$text" =~ "perfect" ]]; then
    memory_type="feedback"
    tags+=("feedback" "confirmed-good")
  fi

  if [[ "$text" =~ "I'm.*expert" ]] || [[ "$text" =~ "new to" ]]; then
    memory_type="user"
    tags+=("expertise")
  fi

  if [[ "$text" =~ prefer.*over ]]; then
    memory_type="user"
    tags+=("user-prefer")
  fi

  if [[ "$text" =~ "stop doing" ]]; then
    memory_type="feedback"
    tags+=("feedback" "stop")
  fi

  if [[ ${#tags[@]} -eq 0 ]]; then
    echo "$memory_type"
  else
    local tags_string="${tags[0]}"
    for ((i=1; i<${#tags[@]}; i++)); do
      tags_string="$tags_string|${tags[$i]}"
    done
    echo "$memory_type|$tags_string"
  fi
}

# Main analyze function
analyze() {
  local content="$1"
  local char_count=${#content}
  local message_count=0
  message_count=$(printf '%s' "$content" | grep -c '^--' 2>/dev/null)

  # Skip if too short
  if [[ $char_count -lt $MIN_CONTENT_LENGTH ]]; then
    echo "skip|skip|social|no-technical-content"
    return 1
  fi

  # Check for user/feedback patterns FIRST (before technical content)
  local user_result=$(detect_user_patterns "$content")
  # Only return if it's actually a user/feedback memory type (not empty, not just "user" without pipe)
  if [[ "$user_result" == "user|"* ]] || [[ "$user_result" == "feedback|"* ]]; then
    echo "$user_result"
    return 0
  fi

  # Check for decision-making (more specific than technical content)
  local decision_detected=$(detect_decision_making "$content")
  if [[ "$decision_detected" == "1" ]]; then
    echo "store|skip|decision-making"
    return 0
  fi

  # Check for problem-solving (more specific than technical content)
  local problem_detected=$(detect_problem_solving "$content")
  if [[ "$problem_detected" == "1" ]]; then
    echo "store|skip|problem-solving"
    return 0
  fi

  # Check for technical content (general case)
  # Do this BEFORE message count check so technical content gets stored even without message exchanges
  local tech_detected=$(detect_tech_content "$content")
  if [[ "$tech_detected" == "1" ]]; then
    echo "store|skip|technical-content"
    return 0
  fi

  # Skip if single message exchange
  if [[ $message_count -lt $MIN_MESSAGES_EXCHANGE ]]; then
    echo "skip|skip|social|single-exchange"
    return 1
  fi

  # No meaningful content detected
  echo "skip|skip|social|no-meaningful-content"
  return 1
}

# Run analyze with content
if [[ $# -gt 0 ]]; then
  analyze "$1"
fi