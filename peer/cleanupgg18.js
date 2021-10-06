var ps = require('ps-node');
const logger = require("../helpers/logger")

function cleanUp() {
    // A simple pid lookup
    ps.lookup({
        command: 'gg18_sign_client',
    }, function (err, resultList) {
        if (err) {
            throw new Error(err);
        }

        resultList.forEach(function (process) {
            if (process) {
                ps.kill(process.pid, 'SIGKILL', function (err) {
                    if (err) {
                        throw new Error(err);
                    }
                    else {
                        logger.info('Process %s has been killed without a clean-up!', process.pid);
                    }
                });
            }
        });
    });
}

module.exports = cleanUp