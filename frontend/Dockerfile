FROM node:20-alpine

WORKDIR /app

# Install curl for backend health wait
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "until curl -fsS http://backend:8000/api/v1/roles/; do echo 'Waiting for backend...'; sleep 2; done; npm run dev -- --host"]
