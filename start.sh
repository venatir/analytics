#!/bin/bash

CURRENTDIR=`pwd`
SCRIPTDIR=`dirname ${BASH_SOURCE[0]}`
cd ${SCRIPTDIR}
SCRIPTDIR=`pwd`;
BINDIR=${SCRIPTDIR}/bin;
LOGSDIR=${SCRIPTDIR}/logs;

node=`which node`;
if [[ -z ${node} ]]; then
    node="/usr/local/bin/nodess1"; #fallback
fi

if [ ! -f "${node}" ]; then
    echo "Cannot find node!"
fi


${node} ${BINDIR}/collector.js >> ${LOGSDIR}/collector.log &
${node} ${BINDIR}/aggregator.js >> ${LOGSDIR}/aggregator.log &
${node} ${BINDIR}/disperser.js >> ${LOGSDIR}/disperser.log &
${node} ${BINDIR}/webServer.js >> ${LOGSDIR}/webServer.log &
${node} ${BINDIR}/generator.js >> ${LOGSDIR}/generator.log &


tail -f ${LOGSDIR}/*

