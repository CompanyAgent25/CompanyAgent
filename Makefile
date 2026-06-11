.PHONY: dev build test clean migrate seed lint

# Development
dev:
	docker-compose up --build

dev-detached:
	docker-compose up --build -d

stop:
	docker-compose down

# Build
build:
	docker-compose build

build-rust:
	cd backend/rust-api && cargo build --release

build-python:
	cd backend/python-services && pip install -r requirements.txt

build-frontend:
	cd frontend && npm run build

# Database
migrate:
	docker-compose exec db psql -U companyagent -d companyagent -f /docker-entrypoint-initdb.d/001_initial.sql

seed:
	docker-compose exec db psql -U companyagent -d companyagent -f /docker-entrypoint-initdb.d/seed.sql

# Tests
test: test-rust test-python test-frontend

test-rust:
	cd backend/rust-api && cargo test

test-python:
	cd backend/python-services && python -m pytest tests/ -v

test-frontend:
	cd frontend && npm test

# Lint
lint:
	cd backend/rust-api && cargo clippy -- -D warnings
	cd backend/python-services && ruff check .
	cd frontend && npm run lint

# Clean
clean:
	docker-compose down -v --rmi local
	cd backend/rust-api && cargo clean
	rm -rf frontend/.next frontend/node_modules
