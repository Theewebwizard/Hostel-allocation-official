# Stage 1: Build React SPA
# Note: Node 20 Alpine is used instead of Node 18 because React Router 7 and Vite 7
# require Node v20+ to compile successfully (specifically for crypto.hash support).
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve React SPA with Nginx
FROM nginx:alpine

# Copy built static assets to nginx html directory
COPY --from=builder /app/build/client /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]