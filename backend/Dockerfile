# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the API port
EXPOSE 3000

# Start the server (adjust if you compile TS first, e.g., to 'npm run start' running node dist/index.js)
CMD ["npm", "run", "dev"]