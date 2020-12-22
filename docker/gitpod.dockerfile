FROM gitpod/workspace-full

RUN npm -g install npm@7 && npm install -g gulp-cli

COPY docker/nginx.conf /etc/nginx/nginx.conf
