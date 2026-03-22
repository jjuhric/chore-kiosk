# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the custom Nginx routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the compiled Vite assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]