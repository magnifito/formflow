#!/bin/bash

# Script to fix PostgreSQL type conflicts when TypeORM synchronize fails
# This cleans up orphaned types that cause "duplicate key value violates unique constraint pg_type_typname_nsp_index"

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-formflow}"
DB_NAME="${DB_NAME:-formflow}"

echo "🔧 Fixing PostgreSQL type conflicts..."
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client tools."
    echo "   On macOS: brew install postgresql"
    exit 1
fi

# Prompt for password
read -sp "Enter database password: " DB_PASSWORD
echo ""

# Connect and clean up orphaned types
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Drop orphaned composite types that might be causing conflicts
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop orphaned composite types (types not associated with any table)
    FOR r IN 
        SELECT typname, nspname 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typtype = 'c'  -- composite type
        AND n.nspname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class c 
            WHERE c.reltype = t.oid
        )
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', r.nspname, r.typname);
        RAISE NOTICE 'Dropped orphaned type: %.%', r.nspname, r.typname;
    END LOOP;
END
\$\$;

-- Also try to drop the form_integration table if it exists in a bad state
DROP TABLE IF EXISTS form_integration CASCADE;

-- Show remaining types for debugging
SELECT typname, typtype 
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
AND t.typtype IN ('c', 'e')
ORDER BY typname;
EOF

echo ""
echo "✅ Type cleanup complete!"
echo "🔄 Now restart your application. TypeORM synchronize should work now."
echo ""
echo "💡 Tip: Consider disabling synchronize and using migrations instead:"
echo "   Set synchronize: false in libs/shared/data-source/src/index.ts"
