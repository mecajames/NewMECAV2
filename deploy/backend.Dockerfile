# ============================================
# Stage 1: Build the backend in Rush monorepo
# ============================================
FROM node:18-slim AS builder

# Install native build dependencies for canvas package (Debian-based)
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

# Copy backend source and build
COPY apps/backend/ ./apps/backend/
RUN cd apps/backend && rushx build

# ============================================
# Stage 2: Production runtime
# ============================================
FROM node:18-slim AS production

# Install only runtime native libraries for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Preserve the same directory structure so pnpm symlinks resolve correctly
WORKDIR /app/apps/backend

# Copy the pnpm store (where actual packages live)
COPY --from=builder /app/common/temp/node_modules/ /app/common/temp/node_modules/

# Copy shared package (workspace dependency)
COPY --from=builder /app/packages/shared/ /app/packages/shared/

# Copy backend node_modules (pnpm symlinks pointing to ../../common/temp/...)
COPY --from=builder /app/apps/backend/node_modules/ ./node_modules/

# Copy built backend artifacts
COPY --from=builder /app/apps/backend/dist/ ./dist/
COPY --from=builder /app/apps/backend/package.json ./

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
