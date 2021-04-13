FROM ubuntu:20.04

RUN apt update \
    && apt upgrade -y \
    && apt install -y curl unzip git sudo

# create user and ensure that user can peform all install steps
ARG username=obj2
RUN adduser ${username} && usermod -aG sudo ${username} \
    && echo "${username} ALL=(root) NOPASSWD:ALL" > /tmp/${username}_all \
    && visudo -c -f /tmp/${username}_all \
    && cp /tmp/${username}_all /etc/sudoers.d/${username}_all

RUN apt autoremove

USER ${username}
WORKDIR /home/${username}
SHELL ["/bin/bash", "-c"]

RUN mkdir -p /home/${username}/workspace \
    && mkdir -p /home/${username}/Downloads \
    && git clone https://github.com/kaisalmen/wsltooling

RUN bash ./wsltooling/scripts/install/installNodejs.sh \
    && source ./.local/bin/env/configureN.sh \
    && n 14 \
    && npm install -g snowpack

WORKDIR /home/${username}/workspace/
