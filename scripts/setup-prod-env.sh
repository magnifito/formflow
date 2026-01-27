#!/bin/bash

# Define paths
ENV_EXAMPLE=".env.production.example"
ENV_FILE=".env.production"

# Check if .env.production already exists
if [ -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE already exists."
  read -p "Do you want to overwrite it? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting setup."
    exit 1
  fi
fi

# Check if example file exists
if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "❌ Error: $ENV_EXAMPLE not found!"
  exit 1
fi

echo "Generating secure secrets..."

# Generate secure random strings
DB_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -base64 32)

CSRF_SECRET=$(openssl rand -base64 32)

echo "Creating $ENV_FILE..."

# Copy example to production env file
cp "$ENV_EXAMPLE" "$ENV_FILE"

# Replace placeholders with generated secrets
# Assuming the example file has placeholders or empty values we want to fill
# We'll use sed to replace specific keys. If keys are empty in example like DB_PASSWORD=, this will work.

# Function to replace or append variable
update_env() {
    local key=$1
    local value=$2
    
    # Escape special characters in value for sed
    safe_value=$(printf '%s\n' "$value" | sed -e 's/[\/&]/\\&/g')
    
    if grep -q "^$key=" "$ENV_FILE"; then
        # Replace existing value
        sed -i '' "s/^$key=.*/$key=$safe_value/" "$ENV_FILE"
    else
        # Append if not found
        echo "$key=$value" >> "$ENV_FILE"
    fi
}

update_env "DB_PASSWORD" "$DB_PASSWORD"
update_env "DB_HOST" "postgres"
update_env "JWT_SECRET" "$JWT_SECRET"

update_env "CSRF_SECRET" "$CSRF_SECRET"

echo "✅ Production environment setup complete!"
echo "Check $ENV_FILE to ensure all other variables are set correctly."
