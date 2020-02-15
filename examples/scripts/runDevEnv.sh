#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/../..)

bash ${DIR_BASE}/examples/scripts/createDevEnv.sh

nginx -g "daemon off;"
