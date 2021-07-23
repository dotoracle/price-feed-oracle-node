const axios = require('axios')
const Web3 = require('web3')
const config = require('config')
const BigNumber = require('bignumber.js')

const tokens = {
    eth: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
    btc: '0xf4030086522a5beea4988f8ca5b36dbc97bee88c',
    link: '0x2c1d072e956affc0d435cb7ac38ef18d24d9127c',
    snx: '0xdc3ea94cd0ac27d9a86c180091e7f78c683d3699',
    '1inch': '0xc929ad75b72593967de83e7f7cda0493458261d9',
    dot: '0x1c07afb8e2b827c5a4739c6d59ae3a5035f28734',
    aave: '0x547a514d5e3769680ce22b2361c10ea13619e8a9',
    bch: '0x9f0f69428f923d6c95b781f89e165c9b2df9789d',
    comp: '0xdbd020caef83efd542f4de03e3cf0c28a4428bd5',
    dash: '0xdbd020caef83efd542f4de03e3cf0c28a4428bd5',
    eos: '0x10a43289895eaff840e8d45995bba89f9115ecee',
    etc: '0xaea2808407b7319a31a383b6f8b60f04bca23ce2',
    fil: '0x1a31d42149e82eb99777f903c08a2e41a00085d3',
    ht: '0xe1329b3f6513912caf589659777b66011aee5880',
    knc: '0xf8ff43e991a81e6ec886a3d281a2c6cc19ae70fc',
    ltc: '0x6af09df7563c363b5763b9102712ebed3b9e859b',
    uni: '0x553303d460ee0afb37edff9be42922d8ff63220e',
    xrp: '0xced2660c6dd1ffd856a5a82c67f3482d88c50b12',
    xtz: '0x5239a625deb44bf3eeac2cd5366ba24b8e9db63f',
    ada: '0xae48c91df1fe419994ffda27da09d5ac69c30f55',
    adx: '0x231e764b44b2c1b7ca171fa8021a24ed520cde10',
    amp: '0x8797abc4641de76342b8ace9c63e3301dc35e3d8',
    ampl: '0xe20ca8d7546932360e37e9d72c1a47334af57706',
    band: '0x919c77acc7373d000b329c1276c76586ed2dd19f',
    bnb: '0x14e613ac84a31f709eadbdf89c6cc390fdc9540a',
    bnt: '0x1e6cf0d433de4fe882a437abc654f58e1e78548c',
    btm: '0x9fccf42d21ab278e205e7bb310d8979f8f4b5751',
    cover: '0x0ad50393f11ffac4dd0fe5f1056448ecb75226cf',
    doge: '0x2465cefd3b488be410b941b1d4b2767088e2a028',
    fxs: '0x6ebc52c8c1089be9eb3945c4350b68b8e4c2233f',
    hegic: '0xbfc189ac214e6a4a35ebc281ad15669619b75534',
    inj: '0xae2ebe3c4d20ce13ce47cbb49b6d7ee631cd816e',
    iost: '0xd0935838935349401c73a06fcde9d63f719e84e5',
    matic: '0x7bac85a8a13a4bcd8abb3eb7d6b4d632c5a57676',
    mkr: '0xec1d1b3b0443256cc3860e24a46f108e699484aa',
    nmr: '0xcc445b35b3636bc7cc7051f4769d8982ed0d449a',
    ocean: '0x7ece4e4e206ed913d991a074a19c192142726797',
    omg: '0x7d476f061f8212a8c9317d5784e72b4212436e93',
    ont: '0xcda3708c5c2907fcca52bb3f9d3e4c2028b89319',
    oxt: '0xd75aaae4af0c398ca13e2667be57af2cca8b5de6',
    ramp: '0x4ea6ec4c1691c62623122b213572b2be5a618c0d',
    ren: '0x0f59666ede214281e956cb3b2d0d69415aff4a01',
    sushi: '0xcc70f09a6cc17553b2e31954cd36e4a2d89501f7',
    sxp: '0xfb0cfd6c19e25db4a08d8a204a387cea48cc138f',
    tomo: '0x3d44925a8e9f9dfd90390e58e92ec16c996a331b',
    tru: '0x26929b85fe284eeab939831002e1928183a10fb1',
    trx: '0xacd0d1a29759cc01e8d925371b72cb2b5610ea25',
    waves: '0x9a79fdcd0e326df6fa34ea13c05d3106610798e9',
    wing: '0x134fe0a225fb8e6683617c13ceb6b3319fb4fb82',
    xhv: '0xeccbeed9691d8521385259ae596cf00d68429de0',
    xmr: '0xfa66458cce7dd15d8650015c4fce4d278271618f',
    yfi: '0xa027702dbb89fbd58938e4324ac03b58d812b0e1',
    akro: '0xb23d105df4958b4b81757e12f2151b5b5183520b',
    ankr: '0x7eed379bf00005cfed29fed4009669de9bcc21ce',
    auction: '0xa6bcac72431a4178f07d016e1d912f56e6d989ec',
    auto: '0x21c44778293e43afc0f318ac051ef867c3bdb5ee',
    avax: '0xff3eeb22b5e3de6e705b44749c2559d704923fd7',
    bat: '0x9441d7556e7820b5ca42082cfa99487d56aca958',
    celo: '0x10d35efa5c26c3d994c511576641248405465aef',
    cro: '0x00cb80cf097d9aa9a3779ad8ee7cf98437eae050',
    lrc: '0xfd33ec6abaa1bdc3d9c6c85f1d6299e5a1a5511f',
    rep: '0xf9fcc6e1186acf6529b1c1949453f51b4b6eee67',
    zrx: '0x2885d15b8af22648b98b122b22fdf4d2a56c6023'
}
const ABI = [
    {
        "inputs": [],
        "name": "aggregator",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_roundId",
                "type": "uint256"
            }
        ],
        "name": "getAnswer",
        "outputs": [
            {
                "internalType": "int256",
                "name": "",
                "type": "int256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint80",
                "name": "_roundId",
                "type": "uint80"
            }
        ],
        "name": "getRoundData",
        "outputs": [
            {
                "internalType": "uint80",
                "name": "roundId",
                "type": "uint80"
            },
            {
                "internalType": "int256",
                "name": "answer",
                "type": "int256"
            },
            {
                "internalType": "uint256",
                "name": "startedAt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "updatedAt",
                "type": "uint256"
            },
            {
                "internalType": "uint80",
                "name": "answeredInRound",
                "type": "uint80"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {
                "internalType": "uint80",
                "name": "roundId",
                "type": "uint80"
            },
            {
                "internalType": "int256",
                "name": "answer",
                "type": "int256"
            },
            {
                "internalType": "uint256",
                "name": "startedAt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "updatedAt",
                "type": "uint256"
            },
            {
                "internalType": "uint80",
                "name": "answeredInRound",
                "type": "uint80"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
]

let ChainLinkHelper = {
    getTokenPrice: async (token) => {
        let web3 = await new Web3(new Web3.providers.HttpProvider(config.rpc.eth.http))
        let tokenAddress = tokens[token.toLowerCase()]
        if (!tokenAddress) {
            return {price: null, timestamp: null}
        }
        let contract = await new web3.eth.Contract(ABI, tokenAddress)
        let decimals = await contract.methods.decimals().call()
        let lastRoundData = await contract.methods.latestRoundData().call()
        let price = new BigNumber(lastRoundData.answer)
        let timestamp = lastRoundData.updatedAt
        return {price: price.div(10**decimals).toNumber(), timestamp: timestamp}
    }
}

module.exports = ChainLinkHelper
