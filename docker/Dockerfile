FROM ubuntu:20.04

RUN apt update && apt upgrade -y && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_15.x | bash -
RUN apt install -y nodejs nginx && npm install -g npm@7

RUN npm install -g gulp-cli

RUN apt autoremove

COPY docker/nginx.conf /etc/nginx/nginx.conf
