# Base image
FROM node:20-alpine

# Build args
ARG DATABASE_URL

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Generate Prisma client
RUN DATABASE_URL=$DATABASE_URL npx prisma generate

# Build Next.js app
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start app
CMD ["npm", "run", "start"]