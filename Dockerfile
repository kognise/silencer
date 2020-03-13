FROM node:10
ENV NODE_ENV production

COPY package.json ./
COPY package-lock.json ./
RUN npm install
RUN apt-get install -y ffmpeg

COPY . .

CMD [ "node", "index.js" ]