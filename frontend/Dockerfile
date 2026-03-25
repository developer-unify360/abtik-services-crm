FROM node:20-alpine

WORKDIR /app

# Install curl for backend health wait
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install

RUN npm install -D tailwindcss postcss autoprefixer

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "until curl -fsS http://crm.abtikservices.in/api/v1/health/; do echo 'Waiting for backend...'; sleep 2; done; npm run dev -- --host"]
