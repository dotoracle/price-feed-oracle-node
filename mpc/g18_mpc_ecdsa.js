const spawn = require('child_process').spawn;
let child = spawn('node', ['child.js'], { timeout: 20000 });

require('dotenv').config()
const logger = require('../helpers/logger');

function startMPCSign(smEndPoint, keyStoreFile, data, cb) {
    const fileName = "signature" + data + ".json"
    logger.info("Starting MPC")
    let signProcess = spawn('./mpc/gg18_sign_client', [`${smEndPoint} mpc/${keyStoreFile}`, `"${data}"`, `mpc/${fileName}`], { timeout: 120000 })
    signProcess.on('close', (code, signal) => {
        logger.info(
            `Signing process terminated due to receipt of signal ${signal} ${code}`);
        if (!signal && code == 0) {
            console.log(`Done: Signature saved in file ${fileName}`);
            let sigJson = require(`./${fileName}`)
            cb({ r: sigJson[1], s: sigJson[3], v: sigJson[5] })
        } else {
            logger.warn('Signing process close due to timeout')
        }
    });
}

module.exports = {
    startMPCSign
}


