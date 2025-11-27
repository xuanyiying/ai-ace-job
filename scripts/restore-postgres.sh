#!/bin/sh
# PostgreSQL Restore Script
# Requirement 9.5 - Database restore

set -e

# Configuration
BACKUP_DIR="/backups"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ${BACKUP_DIR}/resume_optimizer_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}"
    exit 1
fi

echo "[$(date)] Starting PostgreSQL restore from: ${BACKUP_FILE}"
echo "[$(date)] WARNING: This will overwrite the current database!"
echo "[$(date)] Press Ctrl+C within 10 seconds to cancel..."
sleep 10

# Perform restore
PGPASSWORD=${POSTGRES_PASSWORD} pg_restore \
    -h postgres \
    -U ${POSTGRES_USER} \
    -d ${POSTGRES_DB} \
    --clean \
    --if-exists \
    --verbose \
    ${BACKUP_DIR}/${BACKUP_FILE}

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completed successfully!"
else
    echo "[$(date)] ERROR: Restore failed!"
    exit 1
fi

echo "[$(date)] Restore process completed."
