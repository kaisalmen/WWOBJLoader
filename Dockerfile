FROM ubuntu:22.04

RUN apt update && apt upgrade -y && apt install -y curl unzip

ARG username=devbox
RUN adduser ${username} && usermod -aG sudo ${username}

RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt install -y nodejs
RUN curl https://get.volta.sh | bash

RUN apt autoremove

WORKDIR /home/devbox/workspace
