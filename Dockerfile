FROM node:14.15.3-stretch

WORKDIR /var/www/wiki-analyzer

COPY package*.json ./
RUN npm install --silent

COPY . .

RUN npm run build:ts

EXPOSE 3000
CMD ["npm", "run", "start"]
