// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SOVRCreditBridgePOS
 * @author FinSec Architect Team
 * @notice This contract facilitates secure, on-chain point-of-sale (POS) payments
 * using SOVR tokens. It allows for both gasless (meta-transaction) and standard
 * allowance-based payment flows, orchestrated by a secure backend relayer.
 */
contract SOVRCreditBridgePOS is ERC20, Ownable, Pausable, ERC20Permit {

    // --- State Variables ---

    // The total and final supply of tokens.
    uint256 public constant MAX_SUPPLY = 250000 * 10 ** 18;

    // Mapping from a merchant's unique platform ID to their designated receiving wallet address.
    mapping(bytes32 => address) public merchantWallets;

    // The authorized backend address that can call restricted functions.
    address public relayerAddress;

    // --- Events ---

    /**
     * @notice Emitted when a merchant's receiving wallet is set or updated.
     * @param merchantId The unique ID of the merchant.
     * @param wallet The new wallet address for the merchant.
     */
    event MerchantWalletUpdated(bytes32 indexed merchantId, address indexed wallet);

    /**
     * @notice Emitted when a payment is successfully processed and tokens are burned.
     * @param user The address of the user making the payment.
     * @param merchantId The unique ID of the merchant receiving the payment.
     * @param amount The amount of tokens burned for the payment.
     */
    event PaymentBurned(address indexed user, bytes32 indexed merchantId, uint256 amount);

    /**
     * @notice Emitted upon initial contract creation and minting of total supply.
     * @param to The address receiving the initial supply.
     * @param amount The amount of tokens minted.
     */
    event Minted(address indexed user, uint256 amount);

    /**
     * @notice Emitted upon initial credit issuance for tracking purposes.
     * @param to The address receiving the credit.
     * @param amount The amount of credit issued.
     * @param purpose A description of why the credit was issued.
     */
    event CreditIssued(address indexed user, uint256 amount, string purpose);

    // --- Modifiers ---

    /**
     * @dev Throws if called by any account other than the authorized relayer.
     */
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
     * @notice Sets or updates the wallet address for a given merchant ID.
     * @dev Only the contract owner can call this function.
     * @param merchantId The merchant's unique ID.
     * @param wallet The merchant's new receiving wallet address.
     */
    function setMerchantWallet(bytes32 merchantId, address wallet) external onlyOwner {
        require(wallet != address(0), "SOVRPOS: Cannot set wallet to zero address");
        merchantWallets[merchantId] = wallet;
        emit MerchantWalletUpdated(merchantId, wallet);
    }

    /**
     * @notice Sets the authorized relayer address.
     * @dev Only the contract owner can call this function.
     * @param _relayerAddress The address of the backend relayer.
     */
    function setRelayerAddress(address _relayerAddress) external onlyOwner {
        require(_relayerAddress != address(0), "SOVRPOS: Cannot set relayer to zero address");
        relayerAddress = _relayerAddress;
    }

    /**
     * @notice Pauses all token transfers and payment functions.
     * @dev See {Pausable-_pause}.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract, resuming all functions.
     * @dev See {Pausable-_unpause}.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Payment Functions ---

    /**
     * @notice Allows a user to approve and burn tokens in a single, gasless transaction via EIP-712 signature.
     * @dev The backend relayer submits the user's signature to execute this.
     * @param user The address of the user who signed the permit.
     * @param merchantId The ID of the merchant to be paid.
     * @param amount The amount of tokens to be burned.
     * @param deadline The deadline after which the signature is invalid.
     * @param v, r, s The components of the user's ECDSA signature.
     */
    function approveAndBurn(address user, bytes32 merchantId, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external whenNotPaused {
        require(merchantWallets[merchantId] != address(0), "SOVRPOS: Merchant not registered");
        // 1. Use the ERC20Permit logic to verify signature and grant allowance to the relayer (msg.sender)
        permit(user, msg.sender, amount, deadline, v, r, s);

        // 2. Burn tokens from the user's account, consuming the allowance granted to msg.sender.
        _burnFrom(user, amount);

        emit PaymentBurned(user, merchantId, amount);
    }

    /**
     * @notice Allows the authorized relayer to burn tokens from a user who has pre-approved the relayer.
     * @dev This is a standard ERC20 approve/transferFrom flow.
     * @param from The user's address from which to burn tokens.
     * @param merchantId The ID of the merchant to be paid.
     * @param amount The amount of tokens to be burned.
     */
    function burnForPOS(address from, bytes32 merchantId, uint256 amount) external onlyRelayer whenNotPaused {
        require(merchantWallets[merchantId] != address(0), "SOVRPOS: Merchant not registered");
        
        // The relayer (msg.sender) burns tokens from the user 'from', consuming the allowance
        // that 'from' has granted to 'msg.sender'.
        // The _burnFrom function internally handles checking and spending the allowance.
        _burnFrom(from, amount);

        emit PaymentBurned(from, merchantId, amount);
    }
}