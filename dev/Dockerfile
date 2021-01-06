FROM ubuntu:20.04

RUN apt update && apt upgrade -y && apt install -y curl nginx unzip && mkdir /var/run/nginx

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt install -y nodejs
RUN npm install -g gulp-cli

RUN apt autoremove

COPY dev/nginx.conf /etc/nginx/nginx.conf

WORKDIR /workspace/WWOBJLoader
