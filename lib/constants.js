"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMBER_SOURCES_PER_LOG_LINE = exports.MARKET_DEPTH_END_PRICE_SLIPPAGE_PERC = exports.MARKET_DEPTH_DEFAULT_DISTRIBUTION = exports.MARKET_DEPTH_MAX_SAMPLES = exports.GST2_WALLET_ADDRESSES = exports.GST_INTERACTION_COST = exports.GST_DIVISOR = exports.GAS_BURN_COST = exports.GAS_BURN_REFUND = exports.SSTORE_INIT_COST = exports.SSTORE_COST = exports.SIGNER_STATUS_DB_KEY = exports.META_TXN_MIN_SIGNER_ETH_BALANCE = exports.GWEI_DECIMALS = exports.ETH_DECIMALS = exports.TX_WATCHER_UPDATE_METRICS_INTERVAL_MS = exports.NUMBER_OF_BLOCKS_UNTIL_CONFIRMED = exports.TX_WATCHER_POLLING_INTERVAL_MS = exports.DEFAULT_EXPECTED_MINED_SEC = exports.PUBLIC_ADDRESS_FOR_ETH_CALLS = exports.SUBMITTED_TX_DB_POLLING_INTERVAL_MS = exports.TX_HASH_RESPONSE_WAIT_TIME_MS = exports.ETH_TRANSFER_GAS_LIMIT = exports.UNSTICKING_TRANSACTION_GAS_MULTIPLIER = exports.DEFAULT_ETH_GAS_STATION_API_URL = exports.META_TRANSACTION_DOCS_URL = exports.SRA_DOCS_URL = exports.SWAP_DOCS_URL = exports.HEALTHCHECK_PATH = exports.API_KEY_HEADER = exports.METRICS_PATH = exports.META_TRANSACTION_PATH = exports.SWAP_PATH = exports.STAKING_PATH = exports.SRA_PATH = exports.ONE_GWEI = exports.AFFILIATE_FEE_TRANSFORMER_GAS = exports.WRAP_QUOTE_GAS = exports.UNWRAP_QUOTE_GAS = exports.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS = exports.PERCENTAGE_SIG_DIGITS = exports.FIRST_PAGE = exports.DEFAULT_TOKEN_DECIMALS = exports.ADDRESS_HEX_LENGTH = exports.WETH_SYMBOL = exports.ETH_SYMBOL = exports.DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE = exports.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE = exports.GAS_LIMIT_BUFFER_MULTIPLIER = exports.GAS_LIMIT_BUFFER_PERCENTAGE = exports.QUOTE_ORDER_EXPIRATION_BUFFER_MS = exports.MESH_ORDERS_BATCH_HTTP_BYTE_LENGTH = exports.MESH_ORDERS_BATCH_SIZE = exports.HEX_BASE = exports.DEFAULT_VALIDATION_GAS_LIMIT = exports.TEN_MINUTES_MS = exports.ONE_MINUTE_MS = exports.ONE_SECOND_MS = exports.DEFAULT_LOGGER_INCLUDE_TIMESTAMP = exports.DEFAULT_LOCAL_POSTGRES_URI = exports.MAX_TOKEN_SUPPLY_POSSIBLE = exports.ONE = exports.ZERO = exports.DEFAULT_PER_PAGE = exports.DEFAULT_PAGE = exports.ZRX_DECIMALS = exports.NULL_BYTES = exports.NULL_ADDRESS = void 0;
const utils_1 = require("@0x/utils");
const types_1 = require("./types");
// tslint:disable:custom-no-magic-numbers
exports.NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
exports.NULL_BYTES = '0x';
exports.ZRX_DECIMALS = 18;
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_PER_PAGE = 20;
exports.ZERO = new utils_1.BigNumber(0);
exports.ONE = new utils_1.BigNumber(1);
exports.MAX_TOKEN_SUPPLY_POSSIBLE = new utils_1.BigNumber(2).pow(256);
exports.DEFAULT_LOCAL_POSTGRES_URI = 'postgres://api:api@localhost/api';
exports.DEFAULT_LOGGER_INCLUDE_TIMESTAMP = true;
exports.ONE_SECOND_MS = 1000;
exports.ONE_MINUTE_MS = exports.ONE_SECOND_MS * 60;
exports.TEN_MINUTES_MS = exports.ONE_MINUTE_MS * 10;
exports.DEFAULT_VALIDATION_GAS_LIMIT = 10e6;
exports.HEX_BASE = 16;
// The number of orders to post to Mesh at one time
exports.MESH_ORDERS_BATCH_SIZE = 200;
// 5242880 appears to be the max HTTP content length with Mesh
exports.MESH_ORDERS_BATCH_HTTP_BYTE_LENGTH = 2500000;
// Swap Quoter
exports.QUOTE_ORDER_EXPIRATION_BUFFER_MS = exports.ONE_SECOND_MS * 60; // Ignore orders that expire in 60 seconds
exports.GAS_LIMIT_BUFFER_PERCENTAGE = 0.2; // Add 20% to the estimated gas limit
exports.GAS_LIMIT_BUFFER_MULTIPLIER = exports.GAS_LIMIT_BUFFER_PERCENTAGE + 1;
exports.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE = 0.01; // 1% Slippage
exports.DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE = 0.015; // 1.5% Slippage in a fallback route
exports.ETH_SYMBOL = 'ETH';
exports.WETH_SYMBOL = 'WETH';
exports.ADDRESS_HEX_LENGTH = 42;
exports.DEFAULT_TOKEN_DECIMALS = 18;
exports.FIRST_PAGE = 1;
exports.PERCENTAGE_SIG_DIGITS = 4;
exports.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS = 6000;
exports.UNWRAP_QUOTE_GAS = new utils_1.BigNumber(60000);
exports.WRAP_QUOTE_GAS = exports.UNWRAP_QUOTE_GAS;
exports.AFFILIATE_FEE_TRANSFORMER_GAS = new utils_1.BigNumber(15000);
exports.ONE_GWEI = new utils_1.BigNumber(1000000000);
// API namespaces
exports.SRA_PATH = '/sra/v3';
exports.STAKING_PATH = '/staking';
exports.SWAP_PATH = '/swap';
exports.META_TRANSACTION_PATH = '/meta_transaction/v0';
exports.METRICS_PATH = '/metrics';
exports.API_KEY_HEADER = '0x-api-key';
exports.HEALTHCHECK_PATH = '/healthz';
// Docs
exports.SWAP_DOCS_URL = 'https://0x.org/docs/api#swap';
exports.SRA_DOCS_URL = 'https://0x.org/docs/api#sra';
exports.META_TRANSACTION_DOCS_URL = 'https://0x.org/docs/api#meta_transaction';
// Meta Transactions
exports.DEFAULT_ETH_GAS_STATION_API_URL = 'https://ethgasstation.api.0x.org/api/ethgasAPI.json';
exports.UNSTICKING_TRANSACTION_GAS_MULTIPLIER = 1.1;
exports.ETH_TRANSFER_GAS_LIMIT = 21000;
exports.TX_HASH_RESPONSE_WAIT_TIME_MS = exports.ONE_SECOND_MS * 100;
exports.SUBMITTED_TX_DB_POLLING_INTERVAL_MS = 200;
exports.PUBLIC_ADDRESS_FOR_ETH_CALLS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
// TransactionWatcher
// The expected time of a transaction to be mined according to ETHGasStation
// "Fast" gas price estimations multiplied by a safety margin.
exports.DEFAULT_EXPECTED_MINED_SEC = 120 * 1.5;
exports.TX_WATCHER_POLLING_INTERVAL_MS = exports.ONE_SECOND_MS * 5;
exports.NUMBER_OF_BLOCKS_UNTIL_CONFIRMED = 3;
exports.TX_WATCHER_UPDATE_METRICS_INTERVAL_MS = exports.ONE_SECOND_MS * 30;
exports.ETH_DECIMALS = 18;
exports.GWEI_DECIMALS = 9;
exports.META_TXN_MIN_SIGNER_ETH_BALANCE = 0.1;
exports.SIGNER_STATUS_DB_KEY = 'signer_status';
// Gas tokens
exports.SSTORE_COST = 5000;
exports.SSTORE_INIT_COST = 20000;
exports.GAS_BURN_REFUND = 240000;
exports.GAS_BURN_COST = 6870;
exports.GST_DIVISOR = 41130;
exports.GST_INTERACTION_COST = 14154;
exports.GST2_WALLET_ADDRESSES = {
    [types_1.ChainId.Mainnet]: '0x000000d3b08566be75a6db803c03c85c0c1c5b96',
    [types_1.ChainId.Kovan]: exports.NULL_ADDRESS,
    [types_1.ChainId.Ganache]: exports.NULL_ADDRESS,
};
// Market Depth
exports.MARKET_DEPTH_MAX_SAMPLES = 50;
exports.MARKET_DEPTH_DEFAULT_DISTRIBUTION = 1.05;
exports.MARKET_DEPTH_END_PRICE_SLIPPAGE_PERC = 20;
// Logging
exports.NUMBER_SOURCES_PER_LOG_LINE = 12;
//# sourceMappingURL=constants.js.map