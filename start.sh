#!/bin/bash

CURRENTDIR=`pwd`
SCRIPTDIR=`dirname ${BASH_SOURCE[0]}`
cd ${SCRIPTDIR}
SCRIPTDIR=`pwd`;
BINDIR=${SCRIPTDIR}/bin;
LOGSDIR=${SCRIPTDIR}/logs;

node=`which node`;
if [[ -z ${node} ]]; then
    node="/usr/local/bin/node"; #fallback
fi

if [ ! -f "${node}" ]; then
    echo "Cannot find node!"
fi


${node} ${BINDIR}/collector.js 2>&1 >> ${LOGSDIR}/collector.log &
${node} ${BINDIR}/aggregator.js 2>&1 >> ${LOGSDIR}/aggregator.log &
${node} ${BINDIR}/disperser.js 2>&1 >> ${LOGSDIR}/disperser.log &
${node} ${BINDIR}/webServer.js 2>&1 >> ${LOGSDIR}/webServer.log &
sleep 10;
${node} ${BINDIR}/generator.js 2>&1 >> ${LOGSDIR}/generator.log &


