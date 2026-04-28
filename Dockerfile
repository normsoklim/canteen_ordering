# Use Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build app
RUN npm run build

# Expose port
EXPOSE 3000

# Run app
CMD ["node", "dist/main"]