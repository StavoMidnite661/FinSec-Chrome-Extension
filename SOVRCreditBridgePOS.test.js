const { expect } = require("chai");
const { ethers } = require("hardhat");
const { keccak256, toUtf8Bytes } = ethers;

describe("SOVRCreditBridgePOS", function () {
    let SOVRPOS, sovrToken;
    let owner, relayer, user, merchantWallet;
    const MERCHANT_ID = keccak256(toUtf8Bytes("MERCHANT_XYZ"));

    beforeEach(async function () {
        [owner, relayer, user, merchantWallet] = await ethers.getSigners();

        SOVRPOS = await ethers.getContractFactory("SOVRCreditBridgePOS");
        sovrToken = await SOVRPOS.deploy(owner.address, "SOVR", "SOVR");

        // Initial setup
        await sovrToken.connect(owner).setRelayerAddress(relayer.address);
        await sovrToken.connect(owner).setMerchantWallet(MERCHANT_ID, merchantWallet.address);

        // Transfer some tokens to the user for testing
        await sovrToken.connect(owner).transfer(user.address, ethers.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await sovrToken.owner()).to.equal(owner.address);
        });

        it("Should mint the total supply to the owner", async function () {
            const ownerBalance = await sovrToken.balanceOf(owner.address);
            const expectedBalance = (await sovrToken.MAX_SUPPLY()) - ethers.parseEther("1000");
            expect(ownerBalance).to.equal(expectedBalance);
        });

        it("Should have the correct name and symbol", async function () {
            expect(await sovrToken.name()).to.equal("SOVR");
            expect(await sovrToken.symbol()).to.equal("SOVR");
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to set relayer address", async function () {
            await expect(sovrToken.connect(user).setRelayerAddress(user.address))
                .to.be.revertedWithCustomError(sovrToken, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("Should only allow owner to set merchant wallet", async function () {
            await expect(sovrToken.connect(user).setMerchantWallet(MERCHANT_ID, user.address))
                .to.be.revertedWithCustomError(sovrToken, "OwnableUnauthorizedAccount")
                .withArgs(user.address);
        });

        it("Should only allow owner to pause and unpause", async function () {
            await sovrToken.connect(owner).pause();
            expect(await sovrToken.paused()).to.be.true;

            await expect(sovrToken.connect(user).unpause())
                .to.be.revertedWithCustomError(sovrToken, "OwnableUnauthorizedAccount")
                .withArgs(user.address);

            await sovrToken.connect(owner).unpause();
            expect(await sovrToken.paused()).to.be.false;
        });

        it("Should prevent setting relayer address to the zero address", async function () {
            await expect(sovrToken.connect(owner).setRelayerAddress(ethers.ZeroAddress))
                .to.be.revertedWith("SOVRPOS: Cannot set relayer to zero address");
        });

        it("Should prevent setting merchant wallet to the zero address", async function () {
            await expect(sovrToken.connect(owner).setMerchantWallet(MERCHANT_ID, ethers.ZeroAddress))
                .to.be.revertedWith("SOVRPOS: Cannot set wallet to zero address");
        });

        it("Should emit MerchantWalletUpdated when a merchant wallet is set", async function () {
            const newMerchantWallet = ethers.Wallet.createRandom();
            await expect(sovrToken.connect(owner).setMerchantWallet(MERCHANT_ID, newMerchantWallet.address))
                .to.emit(sovrToken, "MerchantWalletUpdated")
                .withArgs(MERCHANT_ID, newMerchantWallet.address);
        });

        it("Owner should still be able to set relayer address when paused", async function () {
            await sovrToken.connect(owner).pause();
            await expect(sovrToken.connect(owner).setRelayerAddress(user.address))
                .to.not.be.reverted; // Should succeed
            expect(await sovrToken.relayerAddress()).to.equal(user.address);
            await sovrToken.connect(owner).unpause(); // Clean up
        });

        it("Owner should still be able to set merchant wallet when paused", async function () {
            await sovrToken.connect(owner).pause();
            const NEW_MERCHANT_ID = keccak256(toUtf8Bytes("NEW_MERCHANT"));
            await expect(sovrToken.connect(owner).setMerchantWallet(NEW_MERCHANT_ID, user.address))
                .to.not.be.reverted; // Should succeed
            expect(await sovrToken.merchantWallets(NEW_MERCHANT_ID)).to.equal(user.address);
            await sovrToken.connect(owner).unpause(); // Clean up
        });
    });

    describe("burnForPOS", function () {
        beforeEach(async function () {
            // User approves the relayer to spend 100 tokens
            await sovrToken.connect(user).approve(relayer.address, ethers.parseEther("100"));
        });

        it("Should fail if called by a non-relayer", async function () {
            await expect(sovrToken.connect(user).burnForPOS(user.address, MERCHANT_ID, ethers.parseEther("50")))
                .to.be.revertedWith("SOVRPOS: Caller is not the authorized relayer");
        });

        it("Should fail if merchant is not registered", async function () {
            const UNKNOWN_MERCHANT_ID = keccak256(toUtf8Bytes("UNKNOWN"));
            await expect(sovrToken.connect(relayer).burnForPOS(user.address, UNKNOWN_MERCHANT_ID, ethers.parseEther("50")))
                .to.be.revertedWith("SOVRPOS: Merchant not registered");
        });

        it("Should successfully burn tokens from the user on behalf of the relayer", async function () {
            const amountToBurn = ethers.parseEther("50");
            const initialUserBalance = await sovrToken.balanceOf(user.address);

            await expect(sovrToken.connect(relayer).burnForPOS(user.address, MERCHANT_ID, amountToBurn))
                .to.emit(sovrToken, "PaymentBurned")
                .withArgs(user.address, MERCHANT_ID, amountToBurn);

            const finalUserBalance = await sovrToken.balanceOf(user.address);
            expect(finalUserBalance).to.equal(initialUserBalance - amountToBurn);
        });

        it("Should fail for insufficient allowance", async function () {
            const amountToBurn = ethers.parseEther("101"); // More than the 100 approved
            await expect(sovrToken.connect(relayer).burnForPOS(user.address, MERCHANT_ID, amountToBurn))
                .to.be.revertedWithCustomError(sovrToken, "ERC20InsufficientAllowance");
        });

        it("Should fail for insufficient user balance", async function () {
            const amountToBurn = ethers.parseEther("1001"); // More than the user's 1000 balance
            await sovrToken.connect(user).approve(relayer.address, amountToBurn); // Approve enough
            await expect(sovrToken.connect(relayer).burnForPOS(user.address, MERCHANT_ID, amountToBurn))
                .to.be.revertedWithCustomError(sovrToken, "ERC20InsufficientBalance");
        });

        it("Should fail if the contract is paused", async function () {
            await sovrToken.connect(owner).pause();
            await expect(sovrToken.connect(relayer).burnForPOS(user.address, MERCHANT_ID, ethers.parseEther("50")))
                .to.be.revertedWithCustomError(sovrToken, "EnforcedPause");
        });

        it("Should allow a zero-amount burn and emit an event", async function () {
            const amountToBurn = 0;
            await expect(sovrToken.connect(relayer).burnForPOS(user.address, MERCHANT_ID, amountToBurn))
                .to.emit(sovrToken, "PaymentBurned")
                .withArgs(user.address, MERCHANT_ID, amountToBurn);
        });
    });

    describe("approveAndBurn (EIP-712 Permit)", function () {
        it("Should fail if merchant is not registered", async function () {
            const amountToBurn = ethers.parseEther("10");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await sovrToken.nonces(user.address);
            const domain = { name: await sovrToken.name(), version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await sovrToken.getAddress() };
            const types = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };
            const values = { owner: user.address, spender: relayer.address, value: amountToBurn, nonce: nonce, deadline: deadline };
            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            const UNKNOWN_MERCHANT_ID = keccak256(toUtf8Bytes("UNKNOWN"));
            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, UNKNOWN_MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.be.revertedWith("SOVRPOS: Merchant not registered");
        });

        it("Should successfully burn tokens using a valid signature", async function () {
            const amountToBurn = ethers.parseEther("75");
            const initialUserBalance = await sovrToken.balanceOf(user.address);
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

            // 1. Craft the EIP-712 signature
            const nonce = await sovrToken.nonces(user.address);
            const domain = {
                name: await sovrToken.name(),
                version: '1',
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await sovrToken.getAddress()
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };

            const values = {
                owner: user.address,
                spender: relayer.address,
                value: amountToBurn,
                nonce: nonce,
                deadline: deadline
            };

            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            // 2. The relayer calls approveAndBurn with the signature
            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.emit(sovrToken, "PaymentBurned")
                .withArgs(user.address, MERCHANT_ID, amountToBurn);

            // 3. Verify balances and nonces
            const finalUserBalance = await sovrToken.balanceOf(user.address);
            expect(finalUserBalance).to.equal(initialUserBalance - amountToBurn);
            expect(await sovrToken.nonces(user.address)).to.equal(nonce + 1n);
        });

        it("Should fail with a re-used signature (replay attack)", async function () {
            const amountToBurn = ethers.parseEther("10");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await sovrToken.nonces(user.address);
            const domain = { name: await sovrToken.name(), version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await sovrToken.getAddress() };
            const types = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };
            const values = { owner: user.address, spender: relayer.address, value: amountToBurn, nonce: nonce, deadline: deadline };
            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            // First use is successful
            await sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s);

            // Second use should fail due to nonce mismatch
            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.be.revertedWithCustomError(sovrToken, "ERC20InvalidNonce");
        });

        it("Should fail if the signature deadline has passed", async function () {
            const amountToBurn = ethers.parseEther("10");
            const deadline = Math.floor(Date.now() / 1000) - 1; // 1 second in the past
            const nonce = await sovrToken.nonces(user.address);
            const domain = { name: await sovrToken.name(), version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await sovrToken.getAddress() };
            const types = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };
            const values = { owner: user.address, spender: relayer.address, value: amountToBurn, nonce: nonce, deadline: deadline };
            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.be.revertedWithCustomError(sovrToken, "ERC20ExpiredDeadline");
        });

        it("Should fail for insufficient user balance", async function () {
            const amountToBurn = ethers.parseEther("1001"); // More than user has
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await sovrToken.nonces(user.address);
            const domain = { name: await sovrToken.name(), version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await sovrToken.getAddress() };
            const types = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };
            const values = { owner: user.address, spender: relayer.address, value: amountToBurn, nonce: nonce, deadline: deadline };
            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            // The permit itself will succeed, but the subsequent _burnFrom will fail.
            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.be.revertedWithCustomError(sovrToken, "ERC20InsufficientBalance");
        });

        it("Should fail if the contract is paused", async function () {
            await sovrToken.connect(owner).pause();
            // A dummy signature is fine since it will fail on the pause check first
            const { v, r, s } = ethers.Signature.from(ethers.hexlify(ethers.randomBytes(65)));
            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, 1, 9999999999, v, r, s))
                .to.be.revertedWithCustomError(sovrToken, "EnforcedPause");
        });

        it("Should allow a zero-amount burn via signature and emit an event", async function () {
            const amountToBurn = 0;
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await sovrToken.nonces(user.address);
            const domain = { name: await sovrToken.name(), version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await sovrToken.getAddress() };
            const types = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };
            const values = { owner: user.address, spender: relayer.address, value: amountToBurn, nonce: nonce, deadline: deadline };
            const signature = await user.signTypedData(domain, types, values);
            const { v, r, s } = ethers.Signature.from(signature);

            await expect(sovrToken.connect(relayer).approveAndBurn(user.address, MERCHANT_ID, amountToBurn, deadline, v, r, s))
                .to.emit(sovrToken, "PaymentBurned")
                .withArgs(user.address, MERCHANT_ID, amountToBurn);
        });
    });
});