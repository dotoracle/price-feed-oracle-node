const signer = require('./signPriceData')
const data = "0x62debf78d596673bce224a85a90da5aecf6e781d9aadcaedd4f65586cfe670d2"

const ret = signer.signMessage(data)
console.log(ret)

let recoveredAddress = signer.recoverSigner(ret.combined)
console.log(recoveredAddress)