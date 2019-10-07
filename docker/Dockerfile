FROM ubuntu:18.04

RUN apt update && apt upgrade -y \
    && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt install -y nodejs nginx

RUN mkdir -p /project/docker

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY package.json /project/package.json
COPY docker/createDevEnv.sh /project/docker/createDevEnv.sh

RUN cd project && npm install
RUN bash project/docker/createDevEnv.sh
