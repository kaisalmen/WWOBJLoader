FROM ubuntu:18.04

RUN apt update && apt upgrade -y && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt install -y nodejs nginx
RUN npm install gulp-cli -g \
    && npm install gulp -D \
    && apt autoremove

COPY docker/nginx.conf /etc/nginx/nginx.conf
