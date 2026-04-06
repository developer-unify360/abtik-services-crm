FROM node:20-alpine

WORKDIR /app

# Install curl for backend health wait
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install

RUN npm install -D tailwindcss postcss autoprefixer

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "API_TARGET=\"${VITE_API_TARGET:-http://backend:8000}\"; until curl -fsS \"${API_TARGET%/}/api/v1/health/\"; do echo 'Waiting for backend...'; sleep 2; done; npm run dev -- --host"]
