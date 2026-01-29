# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Force rebuild by adding timestamp
RUN echo "Build timestamp: $(date)" > /tmp/build-time.txt

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set port to 8080 (Railway default)
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start command - serve will listen on 0.0.0.0:8080
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:8080"]
