#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))

if [[ ! -d ${DIR_ME}/obj/extra/PTV1 ]]; then
    mkdir ${DIR_ME}/obj/extra/PTV1
fi

if [[ ! -d ${DIR_ME}/obj/extra/zomax ]]; then
    mkdir ${DIR_ME}/obj/extra/zomax
fi

echo -e "\nDownloading & decompressing PTV1.zip"
curl https://kaisalmen.de/resource/obj/PTV1/PTV1.zip -o ${DIR_ME}/obj/extra/PTV1/PTV1.zip
unzip -o ${DIR_ME}/obj/extra/PTV1/PTV1.zip -d ${DIR_ME}/obj/extra/PTV1/

echo -e "\nDownloading & decompressing zomax-net_haze-sink-scene.zip"
curl https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-sink-scene.zip -o ${DIR_ME}/obj/extra/zomax/zomax-net_haze-sink-scene.zip
unzip -o ${DIR_ME}/obj/extra/zomax/zomax-net_haze-sink-scene.zip -d ${DIR_ME}/obj/extra/zomax/

echo -e "\nDownloading & decompressing zomax-net_haze-oven-scene.zip"
curl https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-oven-scene.zip -o ${DIR_ME}/obj/extra/zomax/zomax-net_haze-oven-scene.zip
unzip -o ${DIR_ME}/obj/extra/zomax/zomax-net_haze-oven-scene.zip -d ${DIR_ME}/obj/extra/zomax/
