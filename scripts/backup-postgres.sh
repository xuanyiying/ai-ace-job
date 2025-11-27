#!/bin/sh
# PostgreSQL Backup Script
# Requirement 9.5 - Database backup

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="resume_optimizer_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

echo "[$(date)] Starting PostgreSQL backup..."

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Perform backup
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
    -h postgres \
    -U ${POSTGRES_USER} \
    -d ${POSTGRES_DB} \
    --format=custom \
    --compress=9 \
    --verbose \
    --file=${BACKUP_DIR}/${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE} | cut -f1)
    echo "[$(date)] Backup size: ${BACKUP_SIZE}"
    
    # Remove old backups
    echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
    find ${BACKUP_DIR} -name "resume_optimizer_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # List remaining backups
    echo "[$(date)] Current backups:"
    ls -lh ${BACKUP_DIR}/resume_optimizer_*.sql.gz 2>/dev/null || echo "No backups found"
    
    # Optional: Upload to S3 or cloud storage
    if [ ! -z "${BACKUP_S3_BUCKET}" ]; then
        echo "[$(date)] Uploading backup to S3..."
        # Uncomment and configure AWS CLI if needed
        # aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://${BACKUP_S3_BUCKET}/backups/
    fi
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

echo "[$(date)] Backup process completed."
