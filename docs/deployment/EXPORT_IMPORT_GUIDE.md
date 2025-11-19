# Quick Guide: Export Supabase Table Data to Local Docker

## Easiest Method: Use Supabase CLI

```bash
# 1. Link to your production project (one time)
supabase link --project-ref garsyqgdjpryqleufrev

# 2. Pull the schema and data
supabase db pull

# 3. Reset local database with the pulled schema
supabase db reset

# Done! Your local database now matches production
```

## Method 2: Export Specific Tables via Studio

### From Supabase Studio (https://supabase.com/dashboard/project/garsyqgdjpryqleufrev):

1. **Go to SQL Editor**
2. **Run this query:**
   ```sql
   SELECT * FROM site_settings;
   ```
3. **Click "Download Results" → CSV**
4. **Save the file**

### Import to Local:

```bash
# Open local database
make shell

# Inside psql:
\copy site_settings FROM '/path/to/downloaded.csv' CSV HEADER;
```

## Method 3: Using pg_dump (Complete)

### Export from Production:

```bash
# Get your database password from Supabase Dashboard → Settings → Database
# Connection string format: postgresql://postgres:[PASSWORD]@db.garsyqgdjpryqleufrev.supabase.co:5432/postgres

# Export single table with data
pg_dump "postgresql://postgres:[PASSWORD]@db.garsyqgdjpryqleufrev.supabase.co:5432/postgres" \
  --table=site_settings \
  --data-only \
  --column-inserts \
  > backups/site_settings.sql

# Or export all public tables
pg_dump "postgresql://postgres:[PASSWORD]@db.garsyqgdjpryqleufrev.supabase.co:5432/postgres" \
  --schema=public \
  --data-only \
  --column-inserts \
  > backups/all_data.sql
```

### Import to Local:

```bash
# Make sure Supabase is running
make status

# Import the data
psql postgresql://postgres:postgres@localhost:54322/postgres -f backups/site_settings.sql

# Or use the script
make export-import
```

## Method 4: Quick Script Commands

```bash
# Export and import everything
make export-import

# Export just one table
make export-table TABLE=site_settings

# View what's in local database
make shell
\dt                          # List tables
SELECT * FROM site_settings; # View data
```

## For Creating Entities

Once data is imported locally:

```bash
# 1. Run analyzer to see structure
make analyze
make report

# 2. Check the schema
cat docker/analysis-output/local-schema.sql

# 3. Use this to create your TypeScript entities/types
# The analyzer shows you all columns, types, and relationships
```

## Recommended Workflow

**For your site_settings table visible in the screenshot:**

1. **Fastest way:**
   ```bash
   # In Supabase Studio SQL Editor, run:
   SELECT * FROM site_settings;
   
   # Click "Download as CSV"
   # Save to: backups/site_settings.csv
   ```

2. **Import to local:**
   ```bash
   make shell
   
   # In psql:
   \copy site_settings FROM '/Users/mick/Documents/GitHub/NewMECAV2/backups/site_settings.csv' CSV HEADER;
   ```

3. **Generate entity types:**
   ```bash
   make analyze
   
   # Check docker/analysis-output/local-schema.sql for the table structure
   # Use that to create your TypeScript types
   ```

## Troubleshooting

**"Table doesn't exist in local":**
```bash
# Reset local DB with migrations first
supabase db reset
```

**"Permission denied":**
```bash
# Check your database password in Supabase dashboard
# Settings → Database → Database password
```

**"Can't connect to production":**
```bash
# Make sure you're using the direct database URL, not the Supabase URL
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```
