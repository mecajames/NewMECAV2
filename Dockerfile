# Multi-stage Dockerfile for NewMECA V2
# Builds backend, frontend, and analyzer in one file

# ============================================
# Backend Image
# ============================================
FROM node:18-alpine AS backend

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Build (only in production)
ARG NODE_ENV=development
RUN if [ "$NODE_ENV" = "production" ]; then npm run build:backend; fi

EXPOSE 3001
CMD ["npm", "run", "dev:backend"]

# ============================================
# Frontend Image
# ============================================
FROM node:18-alpine AS frontend

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

# Build arguments for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG NODE_ENV=development

# Build (only in production)
RUN if [ "$NODE_ENV" = "production" ]; then npm run build:frontend; fi

EXPOSE 5173
CMD ["npm", "run", "dev"]

# ============================================
# Database Analyzer
# ============================================
FROM node:18-alpine AS analyzer

WORKDIR /app

# Install PostgreSQL client
RUN apk add --no-cache postgresql-client

# Copy analysis script
COPY ./docker/scripts/analyze-simple.sh ./analyze.sh
RUN chmod +x ./analyze.sh

# Create output directory
RUN mkdir -p /app/output

CMD ["./analyze.sh"]
