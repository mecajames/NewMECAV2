# NewMECA V2 - Makefile for Docker operations
# This provides convenient shortcuts for common Docker commands

.PHONY: help build up down restart logs clean analyze db-shell

help: ## Show this help message
	@echo 'NewMECA V2 - Simple Commands'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Supabase (you're already using this)
up: ## Start Supabase
	supabase start

down: ## Stop Supabase
	supabase stop

status: ## Check Supabase status
	supabase status

reset: ## Reset database with migrations
	supabase db reset

restart: down up ## Restart all services

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f postgres

status: ## Show status of all services
	docker-compose ps

clean: ## Stop and remove all containers, volumes, and images
	docker-compose down -v --rmi all

clean-volumes: ## Remove all volumes (WARNING: deletes all data)
	docker-compose down -v

analyze: ## Analyze your local Supabase database structure
	@docker compose --profile tools up analyzer
	@echo ""
	@echo "📁 Results in docker/analysis-output/"
	@echo "   View with: make report"

report: ## View analysis report
	@cat docker/analysis-output/ANALYSIS_REPORT.md 2>/dev/null || echo "❌ Run 'make analyze' first"

shell: ## Open database shell
	docker exec -it supabase_db_NewMECAV2 psql -U postgres -d postgres

backup: ## Backup local database
	@mkdir -p backups
	@docker exec supabase_db_NewMECAV2 pg_dump -U postgres postgres > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✅ Saved to backups/"

export-import: ## Export from production and import to local
	@./scripts/export-import-data.sh

export-table: ## Export single table (use: make export-table TABLE=profiles)
	@if [ -z "$(TABLE)" ]; then \
		echo "❌ Specify table: make export-table TABLE=profiles"; \
		exit 1; \
	fi
	@echo "📦 Exporting $(TABLE)..."
	@mkdir -p backups/tables
	@echo "Enter production database URL:"
	@read -r DB_URL; \
	pg_dump "$$DB_URL" --data-only --table="public.$(TABLE)" --column-inserts > backups/tables/$(TABLE).sql
	@echo "✅ Saved to backups/tables/$(TABLE).sql"
	@echo "Import with: psql postgresql://postgres:postgres@localhost:54322/postgres -f backups/tables/$(TABLE).sql"

studio: ## Open Supabase Studio
	@open http://localhost:54323 || xdg-open http://localhost:54323

logs: ## View Supabase logs
	supabase logs

clean: ## Clean up Docker resources
	docker compose down -v
	docker system prune -f
