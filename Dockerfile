FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Injected at docker build time — e.g.:
#   docker build --build-arg API_URL=https://stage-api.faithfightersforamerica.com \
#                --build-arg NEXT_PUBLIC_API_URL=https://stage-api.faithfightersforamerica.com \
#                --build-arg NEXT_PUBLIC_APP_URL=https://stage-admin.faithfightersforamerica.com \
#                --build-arg NEXT_PUBLIC_FRONTEND_URL=https://stage.faithfightersforamerica.com .
ARG API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_FRONTEND_URL

ENV API_URL=$API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]


