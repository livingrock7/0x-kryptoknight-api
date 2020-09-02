"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultHttpServiceWithRateLimiterConfig = exports.defaultHttpServiceConfig = exports.SWAP_QUOTER_OPTS = exports.SAMPLER_OVERRIDES = exports.ASSET_SWAPPER_MARKET_ORDERS_V1_OPTS = exports.GAS_SCHEDULE_V1 = exports.BASE_GAS_COST_V1 = exports.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS = exports.GAS_SCHEDULE_V0 = exports.PROTOCOL_FEE_MULTIPLIER = exports.DEFAULT_ERC20_TOKEN_PRECISION = exports.MAX_PER_PAGE = exports.ETH_GAS_STATION_API_URL = exports.PROMETHEUS_PORT = exports.ENABLE_PROMETHEUS_METRICS = exports.META_TXN_RATE_LIMITER_CONFIG = exports.META_TXN_MAX_GAS_PRICE_GWEI = exports.META_TXN_SIGNING_ENABLED = exports.META_TXN_RELAY_EXPECTED_MINED_SEC = exports.META_TXN_RELAY_PRIVATE_KEYS = exports.META_TXN_SUBMIT_WHITELISTED_API_KEYS = exports.RFQT_REQUEST_MAX_RESPONSE_MS = exports.RFQT_MAKER_ASSET_OFFERINGS = exports.RFQT_API_KEY_WHITELIST = exports.LIQUIDITY_POOL_REGISTRY_ADDRESS = exports.LOGGER_INCLUDE_TIMESTAMP = exports.POSTGRES_READ_REPLICA_URIS = exports.POSTGRES_URI = exports.SRA_ORDER_EXPIRATION_BUFFER_SECONDS = exports.MAX_ORDER_EXPIRATION_BUFFER_SECONDS = exports.TAKER_FEE_ASSET_DATA = exports.MAKER_FEE_ASSET_DATA = exports.TAKER_FEE_UNIT_AMOUNT = exports.MAKER_FEE_UNIT_AMOUNT = exports.FEE_RECIPIENT_ADDRESS = exports.MESH_HTTP_URI = exports.MESH_WEBSOCKET_URI = exports.ETHEREUM_RPC_URL = exports.PINNED_MM_ADDRESSES = exports.PINNED_POOL_IDS = exports.SWAP_IGNORED_ADDRESSES = exports.MESH_IGNORED_ADDRESSES = exports.WHITELISTED_TOKENS = exports.CHAIN_ID = exports.HTTP_HEADERS_TIMEOUT = exports.HTTP_KEEP_ALIVE_TIMEOUT = exports.HEALTHCHECK_HTTP_PORT = exports.HTTP_PORT = exports.LOG_LEVEL = void 0;
// tslint:disable:custom-no-magic-numbers max-file-line-count
const assert_1 = require("@0x/assert");
const asset_swapper_1 = require("@0x/asset-swapper");
const types_1 = require("@0x/asset-swapper/lib/src/types");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const validateUUID = require("uuid-validate");
const constants_1 = require("./constants");
const token_metadatas_for_networks_1 = require("./token_metadatas_for_networks");
const types_2 = require("./types");
const parse_utils_1 = require("./utils/parse_utils");
var EnvVarType;
(function (EnvVarType) {
    EnvVarType[EnvVarType["AddressList"] = 0] = "AddressList";
    EnvVarType[EnvVarType["StringList"] = 1] = "StringList";
    EnvVarType[EnvVarType["Integer"] = 2] = "Integer";
    EnvVarType[EnvVarType["Port"] = 3] = "Port";
    EnvVarType[EnvVarType["KeepAliveTimeout"] = 4] = "KeepAliveTimeout";
    EnvVarType[EnvVarType["ChainId"] = 5] = "ChainId";
    EnvVarType[EnvVarType["ETHAddressHex"] = 6] = "ETHAddressHex";
    EnvVarType[EnvVarType["UnitAmount"] = 7] = "UnitAmount";
    EnvVarType[EnvVarType["Url"] = 8] = "Url";
    EnvVarType[EnvVarType["UrlList"] = 9] = "UrlList";
    EnvVarType[EnvVarType["WhitelistAllTokens"] = 10] = "WhitelistAllTokens";
    EnvVarType[EnvVarType["Boolean"] = 11] = "Boolean";
    EnvVarType[EnvVarType["FeeAssetData"] = 12] = "FeeAssetData";
    EnvVarType[EnvVarType["NonEmptyString"] = 13] = "NonEmptyString";
    EnvVarType[EnvVarType["APIKeys"] = 14] = "APIKeys";
    EnvVarType[EnvVarType["PrivateKeys"] = 15] = "PrivateKeys";
    EnvVarType[EnvVarType["RfqtMakerAssetOfferings"] = 16] = "RfqtMakerAssetOfferings";
    EnvVarType[EnvVarType["RateLimitConfig"] = 17] = "RateLimitConfig";
})(EnvVarType || (EnvVarType = {}));
// Log level for pino.js
exports.LOG_LEVEL = _.isEmpty(process.env.LOG_LEVEL)
    ? 'info'
    : assertEnvVarType('LOG_LEVEL', process.env.LOG_LEVEL, EnvVarType.NonEmptyString);
// Network port to listen on
exports.HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);
// Network port for the healthcheck service at /healthz, if not provided, it uses the HTTP_PORT value.
exports.HEALTHCHECK_HTTP_PORT = _.isEmpty(process.env.HEALTHCHECK_HTTP_PORT)
    ? exports.HTTP_PORT
    : assertEnvVarType('HEALTHCHECK_HTTP_PORT', process.env.HEALTHCHECK_HTTP_PORT, EnvVarType.Port);
// Number of milliseconds of inactivity the servers waits for additional
// incoming data aftere it finished writing last response before a socket will
// be destroyed.
// Ref: https://nodejs.org/api/http.html#http_server_keepalivetimeout
exports.HTTP_KEEP_ALIVE_TIMEOUT = _.isEmpty(process.env.HTTP_KEEP_ALIVE_TIMEOUT)
    ? 76 * 1000
    : assertEnvVarType('HTTP_KEEP_ALIVE_TIMEOUT', process.env.HTTP_KEEP_ALIVE_TIMEOUT, EnvVarType.KeepAliveTimeout);
// Limit the amount of time the parser will wait to receive the complete HTTP headers.
// NOTE: This value HAS to be higher than HTTP_KEEP_ALIVE_TIMEOUT.
// Ref: https://nodejs.org/api/http.html#http_server_headerstimeout
exports.HTTP_HEADERS_TIMEOUT = _.isEmpty(process.env.HTTP_HEADERS_TIMEOUT)
    ? 77 * 1000
    : assertEnvVarType('HTTP_HEADERS_TIMEOUT', process.env.HTTP_HEADERS_TIMEOUT, EnvVarType.KeepAliveTimeout);
// Default chain id to use when not specified
exports.CHAIN_ID = _.isEmpty(process.env.CHAIN_ID)
    ? types_2.ChainId.Kovan
    : assertEnvVarType('CHAIN_ID', process.env.CHAIN_ID, EnvVarType.ChainId);
// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
exports.WHITELISTED_TOKENS = _.isEmpty(process.env.WHITELIST_ALL_TOKENS)
    ? token_metadatas_for_networks_1.TokenMetadatasForChains.map(tm => tm.tokenAddresses[exports.CHAIN_ID])
    : assertEnvVarType('WHITELIST_ALL_TOKENS', process.env.WHITELIST_ALL_TOKENS, EnvVarType.WhitelistAllTokens);
// Ignored addresses. These are ignored at the ingress (Mesh) level and are never stored.
exports.MESH_IGNORED_ADDRESSES = _.isEmpty(process.env.MESH_IGNORED_ADDRESSES)
    ? []
    : assertEnvVarType('MESH_IGNORED_ADDRESSES', process.env.MESH_IGNORED_ADDRESSES, EnvVarType.AddressList);
// Ignored addresses only for Swap endpoints (still present in database and SRA).
exports.SWAP_IGNORED_ADDRESSES = _.isEmpty(process.env.SWAP_IGNORED_ADDRESSES)
    ? []
    : assertEnvVarType('SWAP_IGNORED_ADDRESSES', process.env.SWAP_IGNORED_ADDRESSES, EnvVarType.AddressList);
// MMer addresses whose orders should be pinned to the Mesh node
exports.PINNED_POOL_IDS = _.isEmpty(process.env.PINNED_POOL_IDS)
    ? []
    : assertEnvVarType('PINNED_POOL_IDS', process.env.PINNED_POOL_IDS, EnvVarType.StringList);
// MMer addresses whose orders should be pinned to the Mesh node
exports.PINNED_MM_ADDRESSES = _.isEmpty(process.env.PINNED_MM_ADDRESSES)
    ? []
    : assertEnvVarType('PINNED_MM_ADDRESSES', process.env.PINNED_MM_ADDRESSES, EnvVarType.AddressList);
// Ethereum RPC Url
exports.ETHEREUM_RPC_URL = assertEnvVarType('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL, EnvVarType.Url);
// Mesh Endpoint
exports.MESH_WEBSOCKET_URI = _.isEmpty(process.env.MESH_WEBSOCKET_URI)
    ? 'ws://localhost:60557'
    : assertEnvVarType('MESH_WEBSOCKET_URI', process.env.MESH_WEBSOCKET_URI, EnvVarType.Url);
exports.MESH_HTTP_URI = _.isEmpty(process.env.MESH_HTTP_URI)
    ? undefined
    : assertEnvVarType('assertEnvVarType', process.env.MESH_HTTP_URI, EnvVarType.Url);
// The fee recipient for orders
exports.FEE_RECIPIENT_ADDRESS = _.isEmpty(process.env.FEE_RECIPIENT_ADDRESS)
    ? constants_1.NULL_ADDRESS
    : assertEnvVarType('FEE_RECIPIENT_ADDRESS', process.env.FEE_RECIPIENT_ADDRESS, EnvVarType.ETHAddressHex);
// A flat fee that should be charged to the order maker
exports.MAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.MAKER_FEE_UNIT_AMOUNT)
    ? new utils_1.BigNumber(0)
    : assertEnvVarType('MAKER_FEE_UNIT_AMOUNT', process.env.MAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// A flat fee that should be charged to the order taker
exports.TAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.TAKER_FEE_UNIT_AMOUNT)
    ? new utils_1.BigNumber(0)
    : assertEnvVarType('TAKER_FEE_UNIT_AMOUNT', process.env.TAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// The maker fee token encoded as asset data
exports.MAKER_FEE_ASSET_DATA = _.isEmpty(process.env.MAKER_FEE_ASSET_DATA)
    ? constants_1.NULL_BYTES
    : assertEnvVarType('MAKER_FEE_ASSET_DATA', process.env.MAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);
// The taker fee token encoded as asset data
exports.TAKER_FEE_ASSET_DATA = _.isEmpty(process.env.TAKER_FEE_ASSET_DATA)
    ? constants_1.NULL_BYTES
    : assertEnvVarType('TAKER_FEE_ASSET_DATA', process.env.TAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);
// If there are any orders in the orderbook that are expired by more than x seconds, log an error
exports.MAX_ORDER_EXPIRATION_BUFFER_SECONDS = _.isEmpty(process.env.MAX_ORDER_EXPIRATION_BUFFER_SECONDS)
    ? 3 * 60
    : assertEnvVarType('MAX_ORDER_EXPIRATION_BUFFER_SECONDS', process.env.MAX_ORDER_EXPIRATION_BUFFER_SECONDS, EnvVarType.KeepAliveTimeout);
// Ignore orders greater than x seconds when responding to SRA requests
exports.SRA_ORDER_EXPIRATION_BUFFER_SECONDS = _.isEmpty(process.env.SRA_ORDER_EXPIRATION_BUFFER_SECONDS)
    ? 10
    : assertEnvVarType('SRA_ORDER_EXPIRATION_BUFFER_SECONDS', process.env.SRA_ORDER_EXPIRATION_BUFFER_SECONDS, EnvVarType.KeepAliveTimeout);
exports.POSTGRES_URI = _.isEmpty(process.env.POSTGRES_URI)
    ? constants_1.DEFAULT_LOCAL_POSTGRES_URI
    : assertEnvVarType('POSTGRES_URI', process.env.POSTGRES_URI, EnvVarType.Url);
exports.POSTGRES_READ_REPLICA_URIS = _.isEmpty(process.env.POSTGRES_READ_REPLICA_URIS)
    ? undefined
    : assertEnvVarType('POSTGRES_READ_REPLICA_URIS', process.env.POSTGRES_READ_REPLICA_URIS, EnvVarType.UrlList);
// Should the logger include time field in the output logs, defaults to true.
exports.LOGGER_INCLUDE_TIMESTAMP = _.isEmpty(process.env.LOGGER_INCLUDE_TIMESTAMP)
    ? constants_1.DEFAULT_LOGGER_INCLUDE_TIMESTAMP
    : assertEnvVarType('LOGGER_INCLUDE_TIMESTAMP', process.env.LOGGER_INCLUDE_TIMESTAMP, EnvVarType.Boolean);
exports.LIQUIDITY_POOL_REGISTRY_ADDRESS = _.isEmpty(process.env.LIQUIDITY_POOL_REGISTRY_ADDRESS)
    ? undefined
    : assertEnvVarType('LIQUIDITY_POOL_REGISTRY_ADDRESS', process.env.LIQUIDITY_POOL_REGISTRY_ADDRESS, EnvVarType.ETHAddressHex);
exports.RFQT_API_KEY_WHITELIST = _.isEmpty(process.env.RFQT_API_KEY_WHITELIST)
    ? []
    : assertEnvVarType('RFQT_API_KEY_WHITELIST', process.env.RFQT_API_KEY_WHITELIST, EnvVarType.StringList);
exports.RFQT_MAKER_ASSET_OFFERINGS = _.isEmpty(process.env.RFQT_MAKER_ASSET_OFFERINGS)
    ? {}
    : assertEnvVarType('RFQT_MAKER_ASSET_OFFERINGS', process.env.RFQT_MAKER_ASSET_OFFERINGS, EnvVarType.RfqtMakerAssetOfferings);
// tslint:disable-next-line:boolean-naming
exports.RFQT_REQUEST_MAX_RESPONSE_MS = 600;
// Whitelisted 0x API keys that can use the meta-txn /submit endpoint
exports.META_TXN_SUBMIT_WHITELISTED_API_KEYS = process.env.META_TXN_SUBMIT_WHITELISTED_API_KEYS === undefined
    ? []
    : assertEnvVarType('META_TXN_SUBMIT_WHITELISTED_API_KEYS', process.env.META_TXN_SUBMIT_WHITELISTED_API_KEYS, EnvVarType.APIKeys);
// The meta-txn relay sender private keys managed by the TransactionWatcher
exports.META_TXN_RELAY_PRIVATE_KEYS = _.isEmpty(process.env.META_TXN_RELAY_PRIVATE_KEYS)
    ? []
    : assertEnvVarType('META_TXN_RELAY_PRIVATE_KEYS', process.env.META_TXN_RELAY_PRIVATE_KEYS, EnvVarType.StringList);
// The expected time for a meta-txn to be included in a block.
exports.META_TXN_RELAY_EXPECTED_MINED_SEC = _.isEmpty(process.env.META_TXN_RELAY_EXPECTED_MINED_SEC)
    ? constants_1.DEFAULT_EXPECTED_MINED_SEC
    : assertEnvVarType('META_TXN_RELAY_EXPECTED_MINED_SEC', process.env.META_TXN_RELAY_EXPECTED_MINED_SEC, EnvVarType.Integer);
// Should TransactionWatcherSignerService sign transactions
// tslint:disable-next-line:boolean-naming
exports.META_TXN_SIGNING_ENABLED = _.isEmpty(process.env.META_TXN_SIGNING_ENABLED)
    ? true
    : assertEnvVarType('META_TXN_SIGNING_ENABLED', process.env.META_TXN_SIGNING_ENABLED, EnvVarType.Boolean);
// The maximum gas price (in gwei) the service will allow
exports.META_TXN_MAX_GAS_PRICE_GWEI = _.isEmpty(process.env.META_TXN_MAX_GAS_PRICE_GWEI)
    ? new utils_1.BigNumber(50)
    : assertEnvVarType('META_TXN_MAX_GAS_PRICE_GWEI', process.env.META_TXN_MAX_GAS_PRICE_GWEI, EnvVarType.UnitAmount);
exports.META_TXN_RATE_LIMITER_CONFIG = _.isEmpty(process.env.META_TXN_RATE_LIMIT_TYPE)
    ? undefined
    : assertEnvVarType('META_TXN_RATE_LIMITER_CONFIG', process.env.META_TXN_RATE_LIMITER_CONFIG, EnvVarType.RateLimitConfig);
// Whether or not prometheus metrics should be enabled.
// tslint:disable-next-line:boolean-naming
exports.ENABLE_PROMETHEUS_METRICS = _.isEmpty(process.env.ENABLE_PROMETHEUS_METRICS)
    ? false
    : assertEnvVarType('ENABLE_PROMETHEUS_METRICS', process.env.ENABLE_PROMETHEUS_METRICS, EnvVarType.Boolean);
exports.PROMETHEUS_PORT = _.isEmpty(process.env.PROMETHEUS_PORT)
    ? 8080
    : assertEnvVarType('PROMETHEUS_PORT', process.env.PROMETHEUS_PORT, EnvVarType.Port);
// Eth Gas Station URL
exports.ETH_GAS_STATION_API_URL = _.isEmpty(process.env.ETH_GAS_STATION_API_URL)
    ? constants_1.DEFAULT_ETH_GAS_STATION_API_URL
    : assertEnvVarType('ETH_GAS_STATION_API_URL', process.env.ETH_GAS_STATION_API_URL, EnvVarType.Url);
// Max number of entities per page
exports.MAX_PER_PAGE = 1000;
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
exports.PROTOCOL_FEE_MULTIPLIER = new utils_1.BigNumber(70000);
const EXCLUDED_SOURCES = (() => {
    switch (exports.CHAIN_ID) {
        case types_2.ChainId.Mainnet:
            return [asset_swapper_1.ERC20BridgeSource.Bancor];
        case types_2.ChainId.Kovan:
            return [
                asset_swapper_1.ERC20BridgeSource.Balancer,
                asset_swapper_1.ERC20BridgeSource.Bancor,
                asset_swapper_1.ERC20BridgeSource.Curve,
                asset_swapper_1.ERC20BridgeSource.Kyber,
                asset_swapper_1.ERC20BridgeSource.LiquidityProvider,
                asset_swapper_1.ERC20BridgeSource.MStable,
            ];
        default:
            return [
                asset_swapper_1.ERC20BridgeSource.Balancer,
                asset_swapper_1.ERC20BridgeSource.Bancor,
                asset_swapper_1.ERC20BridgeSource.Curve,
                asset_swapper_1.ERC20BridgeSource.Eth2Dai,
                asset_swapper_1.ERC20BridgeSource.Kyber,
                asset_swapper_1.ERC20BridgeSource.LiquidityProvider,
                asset_swapper_1.ERC20BridgeSource.MultiBridge,
                asset_swapper_1.ERC20BridgeSource.MStable,
                asset_swapper_1.ERC20BridgeSource.Uniswap,
                asset_swapper_1.ERC20BridgeSource.UniswapV2,
            ];
    }
})();
exports.GAS_SCHEDULE_V0 = {
    [asset_swapper_1.ERC20BridgeSource.Native]: () => 1.5e5,
    [asset_swapper_1.ERC20BridgeSource.Uniswap]: () => 3e5,
    [asset_swapper_1.ERC20BridgeSource.LiquidityProvider]: () => 3e5,
    [asset_swapper_1.ERC20BridgeSource.Eth2Dai]: () => 5.5e5,
    [asset_swapper_1.ERC20BridgeSource.Kyber]: () => 8e5,
    [asset_swapper_1.ERC20BridgeSource.Curve]: fillData => {
        switch (fillData.curve.poolAddress.toLowerCase()) {
            case '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56':
            case '0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c':
                return 9e5;
            case '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51':
            case '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27':
                return 10e5;
            case '0xa5407eae9ba41422680e2e00537571bcc53efbfd':
            case '0x93054188d876f558f4a66b2ef1d97d16edf0895b':
            case '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714':
                return 6e5;
            default:
                throw new Error('Unrecognized Curve address');
        }
    },
    [asset_swapper_1.ERC20BridgeSource.MultiBridge]: () => 6.5e5,
    [asset_swapper_1.ERC20BridgeSource.UniswapV2]: fillData => {
        let gas = 3e5;
        if (fillData.tokenAddressPath.length > 2) {
            gas += 5e4;
        }
        return gas;
    },
    [asset_swapper_1.ERC20BridgeSource.Balancer]: () => 4.5e5,
    [asset_swapper_1.ERC20BridgeSource.Bancor]: () => 4.5e5,
    [asset_swapper_1.ERC20BridgeSource.MStable]: () => 8.5e5,
};
const FEE_SCHEDULE_V0 = Object.assign({}, ...Object.keys(exports.GAS_SCHEDULE_V0).map(k => ({
    [k]: fillData => exports.PROTOCOL_FEE_MULTIPLIER.plus(exports.GAS_SCHEDULE_V0[k](fillData)),
})));
exports.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS = {
    excludedSources: EXCLUDED_SOURCES,
    bridgeSlippage: constants_1.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    maxFallbackSlippage: constants_1.DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    feeSchedule: FEE_SCHEDULE_V0,
    gasSchedule: exports.GAS_SCHEDULE_V0,
    shouldBatchBridgeOrders: true,
    runLimit: Math.pow(2, 8),
};
exports.BASE_GAS_COST_V1 = new utils_1.BigNumber(1.3e5);
// We are keeping cost in gross gas for just the portion of the fill
// overhead is then later added ontop of the conservative estimate
exports.GAS_SCHEDULE_V1 = {
    [asset_swapper_1.ERC20BridgeSource.Native]: () => 1.5e5,
    [asset_swapper_1.ERC20BridgeSource.Uniswap]: () => 1.1e5,
    [asset_swapper_1.ERC20BridgeSource.LiquidityProvider]: () => 1.3e5,
    [asset_swapper_1.ERC20BridgeSource.Eth2Dai]: () => 4e5,
    [asset_swapper_1.ERC20BridgeSource.Kyber]: () => 6e5,
    [asset_swapper_1.ERC20BridgeSource.Curve]: fillData => {
        switch (fillData.curve.poolAddress.toLowerCase()) {
            case '0xa5407eae9ba41422680e2e00537571bcc53efbfd':
            case '0x93054188d876f558f4a66b2ef1d97d16edf0895b':
            case '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714':
                return 1.5e5;
            case '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56':
                return 7.5e5;
            case '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51':
                return 8.5e5;
            case '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27':
                return 10e5;
            case '0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c':
                return 6e5;
            default:
                throw new Error('Unrecognized Curve address');
        }
    },
    [asset_swapper_1.ERC20BridgeSource.MultiBridge]: () => 3.5e5,
    [asset_swapper_1.ERC20BridgeSource.UniswapV2]: fillData => {
        let gas = 1.5e5;
        if (fillData.tokenAddressPath.length > 2) {
            gas += 5e4;
        }
        return gas;
    },
    [asset_swapper_1.ERC20BridgeSource.Balancer]: () => 1.5e5,
    [asset_swapper_1.ERC20BridgeSource.MStable]: () => 7e5,
};
const FEE_SCHEDULE_V1 = Object.assign({}, ...Object.keys(exports.GAS_SCHEDULE_V0).map(k => ({
    [k]: k === asset_swapper_1.ERC20BridgeSource.Native
        ? fillData => exports.PROTOCOL_FEE_MULTIPLIER.plus(exports.GAS_SCHEDULE_V1[k](fillData))
        : fillData => exports.GAS_SCHEDULE_V1[k](fillData),
})));
exports.ASSET_SWAPPER_MARKET_ORDERS_V1_OPTS = {
    excludedSources: EXCLUDED_SOURCES,
    bridgeSlippage: constants_1.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    maxFallbackSlippage: constants_1.DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    feeSchedule: FEE_SCHEDULE_V1,
    gasSchedule: exports.GAS_SCHEDULE_V1,
    shouldBatchBridgeOrders: false,
    runLimit: Math.pow(2, 8),
};
exports.SAMPLER_OVERRIDES = (() => {
    switch (exports.CHAIN_ID) {
        case types_2.ChainId.Ganache:
        case types_2.ChainId.Kovan:
            return { overrides: {}, block: asset_swapper_1.BlockParamLiteral.Latest };
        default:
            return undefined;
    }
})();
exports.SWAP_QUOTER_OPTS = {
    chainId: exports.CHAIN_ID,
    expiryBufferMs: constants_1.QUOTE_ORDER_EXPIRATION_BUFFER_MS,
    liquidityProviderRegistryAddress: exports.LIQUIDITY_POOL_REGISTRY_ADDRESS,
    rfqt: {
        takerApiKeyWhitelist: exports.RFQT_API_KEY_WHITELIST,
        makerAssetOfferings: exports.RFQT_MAKER_ASSET_OFFERINGS,
    },
    ethGasStationUrl: exports.ETH_GAS_STATION_API_URL,
    permittedOrderFeeTypes: new Set([types_1.OrderPrunerPermittedFeeTypes.NoFees]),
    samplerOverrides: exports.SAMPLER_OVERRIDES,
};
exports.defaultHttpServiceConfig = {
    httpPort: exports.HTTP_PORT,
    healthcheckHttpPort: exports.HEALTHCHECK_HTTP_PORT,
    ethereumRpcUrl: exports.ETHEREUM_RPC_URL,
    httpKeepAliveTimeout: exports.HTTP_KEEP_ALIVE_TIMEOUT,
    httpHeadersTimeout: exports.HTTP_HEADERS_TIMEOUT,
    enablePrometheusMetrics: exports.ENABLE_PROMETHEUS_METRICS,
    prometheusPort: exports.PROMETHEUS_PORT,
    meshWebsocketUri: exports.MESH_WEBSOCKET_URI,
    meshHttpUri: exports.MESH_HTTP_URI,
};
exports.defaultHttpServiceWithRateLimiterConfig = Object.assign(Object.assign({}, exports.defaultHttpServiceConfig), { metaTxnRateLimiters: exports.META_TXN_RATE_LIMITER_CONFIG });
function assertEnvVarType(name, value, expectedType) {
    let returnValue;
    switch (expectedType) {
        case EnvVarType.Port:
            try {
                returnValue = parseInt(value, 10);
                const isWithinRange = returnValue >= 0 && returnValue <= 65535;
                if (!isWithinRange) {
                    throw new Error();
                }
            }
            catch (err) {
                throw new Error(`${name} must be between 0 to 65535, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.Integer:
            try {
                returnValue = parseInt(value, 10);
            }
            catch (err) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.KeepAliveTimeout:
            try {
                returnValue = parseInt(value, 10);
            }
            catch (err) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ChainId:
            try {
                returnValue = parseInt(value, 10);
            }
            catch (err) {
                throw new Error(`${name} must be a valid integer, found ${value}.`);
            }
            return returnValue;
        case EnvVarType.ETHAddressHex:
            assert_1.assert.isETHAddressHex(name, value);
            return value;
        case EnvVarType.Url:
            assert_1.assert.isUri(name, value);
            return value;
        case EnvVarType.UrlList:
            assert_1.assert.isString(name, value);
            const urlList = value.split(',');
            urlList.forEach((url, i) => assert_1.assert.isUri(`${name}[${i}]`, url));
            return urlList;
        case EnvVarType.Boolean:
            return value === 'true';
        case EnvVarType.UnitAmount:
            try {
                returnValue = new utils_1.BigNumber(parseFloat(value));
                if (returnValue.isNegative()) {
                    throw new Error();
                }
            }
            catch (err) {
                throw new Error(`${name} must be valid number greater than 0.`);
            }
            return returnValue;
        case EnvVarType.AddressList:
            assert_1.assert.isString(name, value);
            const addressList = value.split(',').map(a => a.toLowerCase());
            addressList.forEach((a, i) => assert_1.assert.isETHAddressHex(`${name}[${i}]`, a));
            return addressList;
        case EnvVarType.StringList:
            assert_1.assert.isString(name, value);
            const stringList = value.split(',');
            return stringList;
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.FeeAssetData:
            assert_1.assert.isString(name, value);
            return value;
        case EnvVarType.NonEmptyString:
            assert_1.assert.isString(name, value);
            if (value === '') {
                throw new Error(`${name} must be supplied`);
            }
            return value;
        case EnvVarType.RateLimitConfig:
            assert_1.assert.isString(name, value);
            return parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(value);
        case EnvVarType.APIKeys:
            assert_1.assert.isString(name, value);
            const apiKeys = value.split(',');
            apiKeys.forEach(apiKey => {
                const isValidUUID = validateUUID(apiKey);
                if (!isValidUUID) {
                    throw new Error(`API Key ${apiKey} isn't UUID compliant`);
                }
            });
            return apiKeys;
        case EnvVarType.RfqtMakerAssetOfferings:
            const offerings = JSON.parse(value);
            // tslint:disable-next-line:forin
            for (const makerEndpoint in offerings) {
                assert_1.assert.isWebUri('market maker endpoint', makerEndpoint);
                const assetOffering = offerings[makerEndpoint];
                assert_1.assert.isArray(`value in maker endpoint mapping, for index ${makerEndpoint},`, assetOffering);
                assetOffering.forEach((assetPair, i) => {
                    assert_1.assert.isArray(`asset pair array ${i} for maker endpoint ${makerEndpoint}`, assetPair);
                    assert_1.assert.assert(assetPair.length === 2, `asset pair array ${i} for maker endpoint ${makerEndpoint} does not consist of exactly two elements.`);
                    assert_1.assert.isETHAddressHex(`first token address for asset pair ${i} for maker endpoint ${makerEndpoint}`, assetPair[0]);
                    assert_1.assert.isETHAddressHex(`second token address for asset pair ${i} for maker endpoint ${makerEndpoint}`, assetPair[1]);
                    assert_1.assert.assert(assetPair[0] !== assetPair[1], `asset pair array ${i} for maker endpoint ${makerEndpoint} has identical assets`);
                });
            }
            return offerings;
        default:
            throw new Error(`Unrecognised EnvVarType: ${expectedType} encountered for variable ${name}.`);
    }
}
//# sourceMappingURL=config.js.map