# Build stage
FROM node:21-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve directly with Node (no Nginx needed)
FROM node:21-alpine

WORKDIR /app
COPY --from=build /app/build ./build

# Install serve to serve static files
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]