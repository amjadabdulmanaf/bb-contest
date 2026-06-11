FROM node:24.16.0-alpine

WORKDIR /usr/src/app

# Install Angular CLI globally
RUN npm install -g @angular/cli

COPY package*.json ./

RUN npm install

COPY . .

# Default command (can be overridden by docker-compose)
CMD ["ng", "serve", "--host", "0.0.0.0"]