FROM ubuntu:18.04

RUN apt update && apt upgrade -y \
    && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt install -y nodejs nginx

RUN mkdir -p /project/docker

COPY package.json /project/package.json
RUN cd project && npm install

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/createDevEnv.sh /project/docker/createDevEnv.sh
COPY docker/runDevEnv.sh /project/docker/runDevEnv.sh
