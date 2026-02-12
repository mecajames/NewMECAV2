#!/bin/sh
set -e

echo "Running MikroORM migrations..."
npx mikro-orm migration:up --config ./dist/db/mikro-orm.config.js || {
  echo "WARNING: Migration failed, starting app anyway"
}

echo "Starting application..."
exec node dist/main.js
