// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SOVRCreditBridgePOS
 * @author FinSec Architect Team
 * @notice This contract facilitates secure, on-chain point-of-sale (POS) payments
 * using SOVR tokens. The token is designed to represent purchasing power, with an
 * intended economic value where it functions as a US-denominated credit system
 * (e.g., where a certain number of tokens correspond to 1 USD).
 * It allows for both gasless (meta-transaction) and standard allowance-based
 * payment flows, orchestrated by a secure backend relayer.
 */
contract SOVRCreditBridgePOS is ERC20, Ownable, Pausable, ERC20Permit {

    // --- State Variables ---

    uint256 public constant MAX_SUPPLY = 250000 * 10 ** 18;
    mapping(bytes32 => address) public merchantWallets;
    address public relayerAddress;

    // --- Events ---

    event MerchantWalletUpdated(bytes32 indexed merchantId, address indexed wallet);
    event PaymentBurned(address indexed user, bytes32 indexed merchantId, uint256 amount);
    event Minted(address indexed user, uint256 amount);
    event CreditIssued(address indexed user, uint256 amount, string purpose);

    // --- Modifiers ---

    modifier onlyRelayer() {
        require(msg.sender == relayerAddress, "SOVRPOS: Caller is not the authorized relayer");
        _;
    }

    // --- Constructor ---

    constructor(address initialOwner, string memory name, string memory symbol)
        ERC20(name, symbol)
        Ownable(initialOwner)
        Pausable()
        ERC20Permit(name)
    {
        _mint(initialOwner, MAX_SUPPLY);
        emit Minted(initialOwner, MAX_SUPPLY);
        emit CreditIssued(initialOwner, MAX_SUPPLY, "Initial Mint to Owner");
    }

    // --- Owner-Only Functions ---
    
    /**
     * @notice Allows the owner to withdraw tokens from the contract to any address.
     * @dev This is critical for initial distribution or if tokens are accidentally sent to the contract.
     * @param to The address to send the tokens to.
     * @param amount The amount of tokens to send.
     */
    function ownerWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "SOVRPOS: Cannot transfer to zero address");
        _transfer(address(this), to, amount);
    }

    function setMerchantWallet(bytes32 merchantId, address wallet) external onlyOwner {
        require(wallet != address(0), "SOVRPOS: Cannot set wallet to zero address");
        merchantWallets[merchantId] = wallet;
        emit MerchantWalletUpdated(merchantId, wallet);
    }

    function setRelayerAddress(address _relayerAddress) external onlyOwner {
        require(_relayerAddress != address(0), "SOVRPOS: Cannot set relayer to zero address");
        relayerAddress = _relayerAddress;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Payment Functions ---

    function approveAndBurn(address user, bytes32 merchantId, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external whenNotPaused {
        require(merchantWallets[merchantId] != address(0), "SOVRPOS: Merchant not registered");
        permit(user, msg.sender, amount, deadline, v, r, s);
        _burn(user, amount);
        emit PaymentBurned(user, merchantId, amount);
    }

    function burnForPOS(address from, bytes32 merchantId, uint256 amount) external onlyRelayer whenNotPaused {
        require(merchantWallets[merchantId] != address(0), "SOVRPOS: Merchant not registered");
        _burnFrom(from, amount);
        emit PaymentBurned(from, merchantId, amount);
    }
}
