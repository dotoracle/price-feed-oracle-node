const argv = process.env.argv.slice(2)
const data = argv[0]
const fileName = "signature" + data + ".json"
const { exec } = require("child_process");
require('dotenv').config()
const smEndPoint = process.env.SM_ENDPOINT
const keyStoreFile = "keys.store"

function startMPCSign() {
    exec(`./gg18_sign_client ${smEndPoint} ${keyStoreFile} "${data}" ${fileName}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`Done: Signature saved in file ${fileName}`);
    });
}

startMPCSign()