# Stage 1: Build the Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend/ ./
RUN npm run build

# Stage 2: Build the Backend
FROM rust:1.80-slim-bullseye AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY src/backend/Cargo.toml src/backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy backend source and frontend build
COPY src/backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./dist

# Build the final binary
RUN cargo build --release

# Stage 3: Final Runtime
FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy binary and migrations
COPY --from=backend-builder /app/target/release/cenlearn-backend /app/cenlearn-backend
COPY --from=backend-builder /app/migrations /app/migrations
COPY --from=backend-builder /app/demo_content.sql /app/demo_content.sql

# Copy the frontend 'dist' folder for the backend to serve
COPY --from=frontend-builder /app/frontend/dist /app/dist

EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL=sqlite:/app/data/cenlearn.db?mode=rwc

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

CMD ["/app/cenlearn-backend"]
