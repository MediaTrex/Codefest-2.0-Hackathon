FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expo Metro bundler and dev server ports
EXPOSE 8081 19000 19001 19002

# Start Expo dev server in web mode (tunnel for mobile access)
CMD ["npx", "expo", "start", "--web"]

