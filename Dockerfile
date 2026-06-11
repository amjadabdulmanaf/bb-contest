# ==========================================
# Stage 1: Build Environment
# ==========================================
FROM node:24.16.0-alpine AS builder

WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install ALL dependencies (including devDependencies like TypeScript and Nest CLI)
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile the NestJS application into the /dist folder
RUN npm run build

# ==========================================
# Stage 2: Production Environment
# ==========================================
FROM node:24.16.0-alpine AS production

WORKDIR /usr/src/app

# Tell Node.js we are in production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (ignores devDependencies)
# This keeps the image tiny and reduces RAM usage
RUN npm install --omit=dev && npm cache clean --force

# Copy ONLY the compiled /dist folder from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy the uploads directory containing seed CSV files
COPY --from=builder /usr/src/app/uploads ./uploads

# Start the server using the compiled JavaScript (No --watch!)
CMD ["node", "dist/main.js"]