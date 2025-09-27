const hre = require("hardhat");

async function main() {
  // The user's wallet address, which will become the owner and receive the initial supply.
  const initialOwner = "0x45bdC226aC70558743F22d206F82776Dcb53C4a6";
  const name = "SOVR Credit";
  const symbol = "SOVR";

  console.log(`Deploying SOVRCreditBridgePOS with owner: ${initialOwner}`);

  const SOVRCreditBridgePOS = await hre.ethers.getContractFactory("SOVRCreditBridgePOS");
  const sovrCreditBridgePOS = await SOVRCreditBridgePOS.deploy(
    initialOwner,
    name,
    symbol
  );

  await sovrCreditBridgePOS.waitForDeployment();

  const contractAddress = await sovrCreditBridgePOS.getAddress();

  console.log(`SOVRCreditBridgePOS deployed to: ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
