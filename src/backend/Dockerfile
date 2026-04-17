# Build stage
FROM rust:1.80-slim-bullseye AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Build actual source
COPY . .
RUN cargo build --release

# Run stage
FROM debian:bullseye-slim

WORKDIR /app
RUN apt-get update && apt-get install -y libssl1.1 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/cenlearn-backend /app/cenlearn-backend
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/demo_content.sql /app/demo_content.sql

EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL=sqlite:/app/data/cenlearn.db?mode=rwc

# Create data directory for SQLite persistence (if mounting a disk)
RUN mkdir -p /app/data

CMD ["/app/cenlearn-backend"]
