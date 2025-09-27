
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
  },
  networks: {
    mumbai: {
      url: "https://rpc.ankr.com/polygon_mumbai",
      accounts: ["0x55b934d75ebd1c4017161e8e3df6cd1836931b399da2d227d22c7a6d2a2cff5e"]
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: "ZTDAHN1WA6Z2JBQK55CKRGT7UWJEE6D98M" // Correct structure as you pointed out
    }
  }
};
