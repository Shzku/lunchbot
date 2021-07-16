#Dockerfile
FROM node:alpine

#Setup workspace
WORKDIR /opt/lunchbot/

#Install neccesary packages
RUN apk update && \
    apk add git curl

#install dependencies
RUN apk add tesseract-ocr

#fetch training data
RUN curl -O https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/master/swe.traineddata && \
    mv swe.traineddata /usr/share/tessdata

#Copy package files
COPY package.json yarn.lock ./

#install packages
RUN yarn preci && yarn ci

#Copy app
COPY . .

#copy ENV
COPY .env.prod .env

#generate app key
RUN sed -i 's/<APP_KEY>/$(node ace generate:key)/p' .env

#expose ports
EXPOSE 3333
EXPOSE 4444

#Execute App
CMD [ "yarn", "start" ]
