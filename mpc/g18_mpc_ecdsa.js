const { exec } = require("child_process");
require('dotenv').config()

function startMPCSign(smEndPoint, keyStoreFile, data, cb) {
    const fileName = "signature" + data + ".json"
    console.log("Starting MPC")
    exec(`./mpc/gg18_sign_client ${smEndPoint} ${keyStoreFile} "${data}" ${fileName}`, (error, stdout, stderr) => {
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