#!/bin/bash

# Test webhook script - sends a test payload to the Test Lab server

if [ -z "$1" ]; then
  echo "Usage: ./test-webhook.sh <org-name>"
  echo "Example: ./test-webhook.sh acme"
  exit 1
fi

ORG=$1
PORT=5177

echo "🧪 Testing webhooks for organization: $ORG"
echo "=================================="
echo ""

# Test generic webhook
echo "Testing /webhook/$ORG..."
curl -X POST http://localhost:$PORT/webhook/$ORG \
  -H "Content-Type: application/json" \
  -d '{
    "formName": "Contact Form",
    "submissionId": 123,
    "data": {
      "name": "Test User",
      "email": "test@formflow.fyi",
      "message": "This is a test submission"
    },
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
echo -e "\n\n"

# Test n8n webhook
echo "Testing /n8n/$ORG..."
curl -X POST http://localhost:$PORT/n8n/$ORG \
  -H "Content-Type: application/json" \
  -d '{
    "event": "form.submitted",
    "formId": 456,
    "data": {
      "email": "n8n-test@formflow.fyi",
      "subject": "Test Subject"
    }
  }'
echo -e "\n\n"

# Test Make.com webhook
echo "Testing /make/$ORG..."
curl -X POST http://localhost:$PORT/make/$ORG \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "new_submission",
    "payload": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }'
echo -e "\n\n"

echo "✅ All webhook tests sent!"
echo "Check the Test Lab server logs for received webhooks"
