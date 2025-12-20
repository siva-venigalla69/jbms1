#!/bin/bash

# ==========================================
# SUPABASE DATABASE BACKUP SCRIPT
# Extracts connection details from .env file
# ==========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SUPABASE DATABASE BACKUP UTILITY${NC}"
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found in current directory${NC}"
    echo "Please run this script from your project root directory"
    exit 1
fi

# Source the .env file to load variables
set -a  # automatically export all variables
source .env
set +a  # stop automatically exporting

# Extract connection details from DATABASE_URL or individual variables
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✅ Found DATABASE_URL in .env${NC}"

    # Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
    # Note: If DATABASE_URL has [SERVICE_ROLE_KEY] placeholder, we need the actual service role key

    if [[ "$DATABASE_URL" == *"[SERVICE_ROLE_KEY]"* ]]; then
        echo -e "${YELLOW}⚠️  DATABASE_URL contains [SERVICE_ROLE_KEY] placeholder${NC}"
        echo "Please replace [SERVICE_ROLE_KEY] with your actual service role key"
        echo ""
        echo "Your service role key should be in Supabase Dashboard → Settings → API"
        echo "Look for 'service_role' key (starts with 'eyJ...')"
        echo ""
        echo -e "${BLUE}📋 Current DATABASE_URL format:${NC}"
        echo "$DATABASE_URL"
        echo ""
        echo -e "${BLUE}📋 Expected format:${NC}"
        echo "postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...@db.pvatfzwzfgioypdnqjay.supabase.co:5432/postgres"
        exit 1
    fi

    # Extract components from DATABASE_URL
    DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"
    if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        echo -e "${RED}❌ Error: Could not parse DATABASE_URL${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Display extracted connection details (hide password for security)
echo -e "${GREEN}✅ Connection details extracted:${NC}"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: ${DB_PASSWORD:0:10}... (hidden for security)"
echo ""

# Set PostgreSQL environment variables
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGPASSWORD="$DB_PASSWORD"
export PGDATABASE="$DB_NAME"

echo -e "${BLUE}📋 Available backup options:${NC}"
echo "1. Full backup (recommended)"
echo "2. Data-only backup"
echo "3. Schema-only backup"
echo "4. Compressed backup"
echo "5. Custom backup with timestamp"
echo ""

read -p "Choose backup type (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}🔄 Creating full backup...${NC}"
        BACKUP_FILE="backup_full_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --verbose --file="$BACKUP_FILE"
        ;;
    2)
        echo -e "${GREEN}🔄 Creating data-only backup...${NC}"
        BACKUP_FILE="backup_data_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --data-only --verbose --file="$BACKUP_FILE"
        ;;
    3)
        echo -e "${GREEN}🔄 Creating schema-only backup...${NC}"
        BACKUP_FILE="backup_schema_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --schema-only --verbose --file="$BACKUP_FILE"
        ;;
    4)
        echo -e "${GREEN}🔄 Creating compressed backup...${NC}"
        BACKUP_FILE="backup_compressed_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --compress=9 --verbose --file="$BACKUP_FILE"
        ;;
    5)
        read -p "Enter custom backup name (without extension): " custom_name
        echo -e "${GREEN}🔄 Creating custom backup...${NC}"
        BACKUP_FILE="${custom_name}_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --verbose --file="$BACKUP_FILE"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Defaulting to full backup.${NC}"
        BACKUP_FILE="backup_full_$(date +%Y%m%d_%H%M%S).backup"
        pg_dump --format=custom --verbose --file="$BACKUP_FILE"
        ;;
esac

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo -e "${BLUE}📁 Backup file: $BACKUP_FILE${NC}"

    # Show backup file size
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        echo -e "${BLUE}📊 Backup size: $BACKUP_SIZE${NC}"
    fi

    # Create backups directory if it doesn't exist
    mkdir -p backups

    # Move backup to backups directory
    mv "$BACKUP_FILE" "backups/$BACKUP_FILE"
    echo -e "${BLUE}📂 Moved to: backups/$BACKUP_FILE${NC}"

    echo ""
    echo -e "${GREEN}🎯 BACKUP COMMANDS FOR FUTURE USE:${NC}"
    echo ""
    echo "To create another backup:"
    echo "pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --format=custom --file=backup_\$(date +%Y%m%d_%H%M%S).backup"
    echo ""
    echo "To restore this backup:"
    echo "pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists backups/$BACKUP_FILE"
    echo ""
    echo -e "${YELLOW}💡 Remember to set PGPASSWORD environment variable:${NC}"
    echo "export PGPASSWORD=\"your_service_role_key\""

else
    echo ""
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "Check your connection details and try again."
    exit 1
fi

# Offer to create a restore script
echo ""
read -p "Create a restore script for this backup? (y/N): " create_restore
if [[ $create_restore =~ ^[Yy]$ ]]; then
    RESTORE_SCRIPT="restore_$(basename "$BACKUP_FILE" .backup).sh"

    cat > "backups/$RESTORE_SCRIPT" << EOF
#!/bin/bash

# Restore script for $BACKUP_FILE
# Created: $(date)

# Set connection details
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGDATABASE="$DB_NAME"

# You need to set your password
echo "Enter your database password (service role key):"
read -s PGPASSWORD
export PGPASSWORD

echo "🔄 Restoring database from $BACKUP_FILE..."
pg_restore --clean --if-exists --verbose "$BACKUP_FILE"

if [ \$? -eq 0 ]; then
    echo "✅ Restore completed successfully!"
else
    echo "❌ Restore failed!"
    exit 1
fi
EOF

    chmod +x "backups/$RESTORE_SCRIPT"
    echo -e "${GREEN}✅ Restore script created: backups/$RESTORE_SCRIPT${NC}"
fi

echo ""
echo -e "${GREEN}🎉 BACKUP PROCESS COMPLETED!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "• Backup file: backups/$BACKUP_FILE"
echo "• Database: $DB_NAME on $DB_HOST"
echo "• Timestamp: $(date)"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Test the backup by restoring to a test database"
echo "2. Store backup in a secure location"
echo "3. Set up automated backups using this script"