#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/../..)

if [[ ! -d ${DIR_BASE}/examples/models/obj/PTV1 ]]; then
    mkdir ${DIR_BASE}/examples/models/obj/PTV1
fi

if [[ ! -d ${DIR_BASE}/examples/models/obj/zomax ]]; then
    mkdir ${DIR_BASE}/examples/models/obj/zomax
fi

echo -e "\nDownloading & decompressing PTV1.zip"
curl https://kaisalmen.de/resource/obj/PTV1/PTV1.zip -o ${DIR_BASE}/examples/models/obj/PTV1/PTV1.zip
unzip -o ${DIR_BASE}/examples/models/obj/PTV1/PTV1.zip -d ${DIR_BASE}/examples/models/obj/PTV1/
gzip ${DIR_BASE}/examples/models/obj/PTV1/PTV1.mtl
gzip ${DIR_BASE}/examples/models/obj/PTV1/PTV1.obj


echo -e "\nDownloading & decompressing zomax-net_haze-sink-scene.zip"
curl https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-sink-scene.zip -o ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-sink-scene.zip
unzip -o ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-sink-scene.zip -d ${DIR_BASE}/examples/models/obj/zomax/
gzip ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-sink-scene.obj

echo -e "\nDownloading & decompressing zomax-net_haze-oven-scene.zip"
curl https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-oven-scene.zip -o ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-oven-scene.zip
unzip -o ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-oven-scene.zip -d ${DIR_BASE}/examples/models/obj/zomax/
gzip ${DIR_BASE}/examples/models/obj/zomax/zomax-net_haze-oven-scene.obj
