#!/bin/bash

# This script is invoked after container launch

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

bash ${DIR_BASE}/dev/createDevEnv.sh
if [[ ! -e /etc/nginx/nginx.conf ]]; then
  cp ${DIR_BASE}/dev/nginx.conf /etc/nginx/nginx.conf
fi

nginx -g "daemon off;"
