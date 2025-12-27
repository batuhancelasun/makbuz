FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Copy icons to public directory
COPY makbuz_logo.png public/icon.png
COPY makbuz_logo_transparent.png public/icon-transparent.png

# Create data directory
RUN mkdir -p data uploads

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]

