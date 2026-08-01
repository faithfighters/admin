FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG ENV=production
RUN if [ "$ENV" = "stage" ]; then cp .env.staging .env.local; fi

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
