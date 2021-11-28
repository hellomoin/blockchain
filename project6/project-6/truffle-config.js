const HDWalletProvider = require('truffle-hdwallet-provider');
const infuraKey = "5e9d154a4dbb4c26afecded61e76bf1e";
//
const fs = require('fs');
const mnemonic = fs.readFileSync("../.secret").toString().trim();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
			provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),
			network_id: 4,       // rinkeby's id
			gas: 4500000,        // rinkeby has a lower block limit than mainnet
			gasPrice: 10000000000,
		},
  }
};