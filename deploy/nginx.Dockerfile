# ============================================
# Stage 1: Build the frontend in Rush monorepo
# ============================================
FROM node:18-slim AS builder

# Install native build dependencies (needed because rush install builds ALL
# monorepo packages including backend's canvas dependency)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Rush globally
RUN npm install -g @microsoft/rush@5.119.0

WORKDIR /app

# Copy Rush configuration files first (for layer caching)
COPY rush.json ./
COPY common/config/rush/ ./common/config/rush/
COPY common/scripts/ ./common/scripts/

# Copy all package.json files (Rush needs these to resolve workspace)
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies via Rush
RUN rush install --purge

# Copy shared package source and build it first
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && rushx build

# Build-time arguments for Vite environment variables (baked into static files)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=""
ARG VITE_RECAPTCHA_SITE_KEY=""
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ARG VITE_GA4_MEASUREMENT_ID=""

# Set build args as env vars so Vite can pick them up during build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_GA4_MEASUREMENT_ID=$VITE_GA4_MEASUREMENT_ID

# Copy frontend source and build
COPY apps/frontend/ ./apps/frontend/
RUN cd apps/frontend && rushx build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/

# Copy custom nginx config
COPY deploy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
