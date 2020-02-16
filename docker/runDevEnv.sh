#!/bin/bash

# This script is invoked after container launch

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

bash ${DIR_BASE}/docker/createDevEnv.sh

nginx -g "daemon off;"
