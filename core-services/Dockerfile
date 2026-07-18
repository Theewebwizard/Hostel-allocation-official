# Stage 1: Build NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and config files
COPY --from=builder /app/dist ./dist

# Set permissions and use non-root node user
RUN chown -R node:node /app
USER node

EXPOSE 3000

ENV PORT=3000

# Start the server
CMD ["node", "dist/src/main"]
