FROM node:24.16.0-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Run NestJS in watch mode
CMD ["npm", "run", "start:dev"]