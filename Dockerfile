#FROM registry.access.redhat.com/ubi7/ubi:latest
FROM ubuntu:18.04

RUN apt update && apt upgrade -y \
    && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt install -y nodejs nginx

RUN mkdir /project

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY package.json /project/package.json
COPY createDevEnv.sh /project/createDevEnv.sh

RUN cd project \
    && npm install \
    && bash createDevEnv.sh
