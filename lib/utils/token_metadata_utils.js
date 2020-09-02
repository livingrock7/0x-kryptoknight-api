"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTokenDecimalsIfExists = exports.findTokenAddressOrThrowApiError = exports.isTokenAddress = exports.findTokenAddressOrThrow = exports.isWETHSymbolOrAddress = exports.isETHSymbol = exports.getTokenMetadataIfExists = void 0;
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const token_metadatas_for_networks_1 = require("../token_metadatas_for_networks");
/**
 * Returns a TokenMetadata instance, given either a token address or symobl and the network that the token is deployed on.
 *
 * @param tokenAddressOrSymbol the address or symbol of an ERC20 token
 * @param chainId the Network ID
 */
function getTokenMetadataIfExists(tokenAddressOrSymbol, chainId) {
    let entry;
    if (isTokenAddress(tokenAddressOrSymbol)) {
        entry = token_metadatas_for_networks_1.TokenMetadatasForChains.find(tm => tm.tokenAddresses[chainId].toLowerCase() === tokenAddressOrSymbol.toLowerCase());
    }
    else {
        const normalizedSymbol = (isETHSymbol(tokenAddressOrSymbol) ? 'WETH' : tokenAddressOrSymbol).toLowerCase();
        entry = token_metadatas_for_networks_1.TokenMetadatasForChains.find(tm => tm.symbol.toLowerCase() === normalizedSymbol);
    }
    if (entry) {
        return {
            symbol: entry.symbol,
            decimals: entry.decimals,
            tokenAddress: entry.tokenAddresses[chainId],
        };
    }
}
exports.getTokenMetadataIfExists = getTokenMetadataIfExists;
/**
 *  Returns true if this symbol represents ETH
 *
 * @param tokenSymbol the symbol of the token
 */
function isETHSymbol(tokenSymbol) {
    return tokenSymbol.toLowerCase() === constants_1.ETH_SYMBOL.toLowerCase();
}
exports.isETHSymbol = isETHSymbol;
/**
 *  Returns true if this symbol represents WETH
 *
 * @param tokenSymbol the symbol of the token
 */
function isWETHSymbolOrAddress(tokenAddressOrSymbol, chainId) {
    // force downcast to TokenMetadata the optional
    const wethAddress = getTokenMetadataIfExists(constants_1.WETH_SYMBOL, chainId).tokenAddress;
    return (tokenAddressOrSymbol.toLowerCase() === constants_1.WETH_SYMBOL.toLowerCase() ||
        tokenAddressOrSymbol.toLowerCase() === wethAddress);
}
exports.isWETHSymbolOrAddress = isWETHSymbolOrAddress;
/**
 * Returns the address of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
function findTokenAddressOrThrow(symbolOrAddress, chainId) {
    if (isTokenAddress(symbolOrAddress)) {
        return symbolOrAddress;
    }
    const entry = getTokenMetadataIfExists(symbolOrAddress, chainId);
    if (!entry) {
        // NOTE(jalextowle): Use the original symbol to increase readability.
        throw new Error(`Could not find token \`${symbolOrAddress}\``);
    }
    return entry.tokenAddress;
}
exports.findTokenAddressOrThrow = findTokenAddressOrThrow;
/**
 * Returns whether a string is an address or not.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 */
function isTokenAddress(symbolOrAddress) {
    return symbolOrAddress.startsWith('0x') && symbolOrAddress.length === constants_1.ADDRESS_HEX_LENGTH;
}
exports.isTokenAddress = isTokenAddress;
/**
 * Attempts to find the address of the token and throws if not found
 *
 * @param address the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
function findTokenAddressOrThrowApiError(address, field, chainId) {
    try {
        return findTokenAddressOrThrow(address, chainId);
    }
    catch (e) {
        throw new errors_1.ValidationError([
            {
                field,
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: e.message,
            },
        ]);
    }
}
exports.findTokenAddressOrThrowApiError = findTokenAddressOrThrowApiError;
/**
 * Returns the decimals of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
function findTokenDecimalsIfExists(symbolOrAddress, chainId) {
    const entry = getTokenMetadataIfExists(symbolOrAddress, chainId);
    if (entry) {
        return entry.decimals;
    }
}
exports.findTokenDecimalsIfExists = findTokenDecimalsIfExists;
//# sourceMappingURL=token_metadata_utils.js.map