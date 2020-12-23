FROM gitpod/workspace-full

RUN npm install -g gulp-cli

COPY docker/nginx.conf /etc/nginx/nginx.conf
