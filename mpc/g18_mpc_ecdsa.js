const { exec } = require("child_process");
require('dotenv').config()
const logger = require('../helpers/logger');

function startMPCSign(smEndPoint, keyStoreFile, data, cb) {
    const fileName = "signature" + data + ".json"
    logger.info("Starting MPC for %s", data)
    exec(`./mpc/gg18_sign_client ${smEndPoint} mpc/${keyStoreFile} "${data}" mpc/${fileName}`, {timeout: 120000, killSignal: "SIGINT"}, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`Done: Signature saved in file ${fileName}`);
        let sigJson = require(`./${fileName}`)
        cb({r: sigJson[1], s: sigJson[3], v: sigJson[5]})
    });
}

module.exports = {
    startMPCSign
}


