# Stage 1: Build the Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend/ ./
RUN npm run build

# Stage 2: Build the Backend
FROM rust:1.85-slim-bookworm AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy backend source
COPY src/backend/ ./

# Build the final binary
RUN cargo build --release

# Stage 3: Final Runtime
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libssl3 ca-certificates libgcc-s1 libc6 && rm -rf /var/lib/apt/lists/*

# Copy binary and migrations
COPY --from=backend-builder /app/target/release/censtudy-backend /app/censtudy-backend
RUN chmod +x /app/censtudy-backend
COPY --from=backend-builder /app/migrations /app/migrations
COPY --from=backend-builder /app/demo_content.sql /app/demo_content.sql

# Copy the frontend 'dist' folder for the backend to serve
COPY --from=frontend-builder /app/frontend/dist /app/dist

EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL=sqlite:///app/data/censtudy.db?mode=rwc

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

CMD ["sh", "-c", "echo 'Running diagnostics...' && ls -l /app/censtudy-backend && ldd /app/censtudy-backend && echo 'Starting application...' && /app/censtudy-backend"]
