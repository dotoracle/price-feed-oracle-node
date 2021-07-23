const data = "7ca55ad2ad216bd41822ae9f0a1ccd35bd3a5f5517316567cc7f2a05c7d09b8d"
const fileName = "signature" + data
const { exec } = require("child_process");
const smEndPoint = "http://45.32.28.180:8001"
const keyStoreFile = "keys.store"
exec(`gg18_sign_client ${smEndPoint} ${keyStoreFile} "${data}" ${fileName}`, (error, stdout, stderr) => {
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