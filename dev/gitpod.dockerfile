FROM gitpod/workspace-full

RUN npm install -g gulp-cli

COPY dev/nginx.conf /etc/nginx/nginx.conf
