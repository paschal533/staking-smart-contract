require("@nomiclabs/hardhat-waffle");
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
    },
    evmosTestnet: {
      url: 'https://eth.bd.evmos.dev:8545',
      accounts: [process.env.PrivateKey], // add the account that will deploy the contract (private key)
    }
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};