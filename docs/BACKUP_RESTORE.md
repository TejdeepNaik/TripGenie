# TripGenie PostgreSQL Backup & Recovery Manual

This document details the practical backup, restore, verification, and disaster recovery procedures for the TripGenie PostgreSQL database.

---

## 1. Environment & Prerequisites

TripGenie requires **PostgreSQL 16**.
Required CLI utilities:
- `pg_dump` (PostgreSQL client backup tool)
- `pg_restore` / `psql` (PostgreSQL client restore tool)

---

## 2. Creating a Database Backup

To export a consistent, custom-format database backup:

```bash
# Set environment variables
export PGHOST=${POSTGRES_HOST:-localhost}
export PGPORT=${POSTGRES_PORT:-5432}
export PGUSER=${POSTGRES_USER:-postgres}
export PGPASSWORD=${POSTGRES_PASSWORD:-postgres}
export PGDATABASE=${POSTGRES_DB:-tripgenie}

# Backup directory and timestamped filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

BACKUP_FILE="${BACKUP_DIR}/tripgenie_backup_${TIMESTAMP}.dump"

# Perform compressed custom-format dump
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -F c -b -v -f $BACKUP_FILE $PGDATABASE

echo "✅ Backup created successfully at: $BACKUP_FILE"
```

---

## 3. Database Restore Procedure

To restore a backup into a target PostgreSQL 16 database:

```bash
# Target database parameters
RESTORE_DB="tripgenie_restored"

# 1. Create clean target database
psql -h $PGHOST -p $PGPORT -U $PGUSER -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
psql -h $PGHOST -p $PGPORT -U $PGUSER -c "CREATE DATABASE ${RESTORE_DB};"

# 2. Restore schema and data from backup file
pg_restore -h $PGHOST -p $PGPORT -U $PGUSER -d ${RESTORE_DB} -v $BACKUP_FILE

echo "✅ Database restored successfully into: ${RESTORE_DB}"
```

---

## 4. Backup Integrity & Restoration Verification

After restoring to a disposable test database, verify structural and data integrity:

1. **Verify Database Connectivity & Tables**:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema='public';
   ```
   Expect core tables: `User`, `Trip`, `Activity`, `Place`, `Booking`, `Payment`, `ProviderEventLog`, `_prisma_migrations`.

2. **Verify Indexes & Unique Constraints**:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';
   ```
   Verify existence of `Payment_idempotencyKey_key` and foreign key indexes.

3. **Verify Application Connection**:
   Update `DATABASE_URL` in `.env.test` to point to `tripgenie_restored` and run application health check:
   ```bash
   pnpm --filter @tripgenie/api test
   ```
