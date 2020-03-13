FROM node:10
ENV NODE_ENV production

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

CMD [ "node", "index.js" ]