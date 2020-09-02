"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetaTxnServiceFromOrderBookService = exports.createSwapServiceFromOrderBookService = exports.getAppAsync = exports.getDefaultAppDependenciesAsync = exports.getContractAddressesForNetworkOrThrowAsync = void 0;
// tslint:disable-next-line:ordered-imports
const apm = require("elastic-apm-node");
apm.start({ active: process.env.ELASTIC_APM_ACTIVE === 'true' });
// tslint:disable-next-line:ordered-imports
const asset_swapper_1 = require("@0x/asset-swapper");
const contract_addresses_1 = require("@0x/contract-addresses");
const dev_utils_1 = require("@0x/dev-utils");
const express = require("express");
const config_1 = require("./config");
const constants_1 = require("./constants");
const db_connection_1 = require("./db_connection");
const logger_1 = require("./logger");
const order_book_service_order_provider_1 = require("./order_book_service_order_provider");
const http_service_runner_1 = require("./runners/http_service_runner");
const order_watcher_service_runner_1 = require("./runners/order_watcher_service_runner");
const meta_transaction_service_1 = require("./services/meta_transaction_service");
const metrics_service_1 = require("./services/metrics_service");
const orderbook_service_1 = require("./services/orderbook_service");
const staking_data_service_1 = require("./services/staking_data_service");
const swap_service_1 = require("./services/swap_service");
const types_1 = require("./types");
const mesh_client_1 = require("./utils/mesh_client");
const order_store_db_adapter_1 = require("./utils/order_store_db_adapter");
const rate_limiters_1 = require("./utils/rate-limiters");
const meta_transaction_composable_rate_limiter_1 = require("./utils/rate-limiters/meta_transaction_composable_rate_limiter");
function deploySamplerContractAsync(provider, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const web3Wrapper = new dev_utils_1.Web3Wrapper(provider);
        const _chainId = yield web3Wrapper.getChainIdAsync();
        if (_chainId !== chainId) {
            throw new Error(`Incorrect Chain Id: ${_chainId}`);
        }
        const [account] = yield web3Wrapper.getAvailableAddressesAsync();
        try {
            const sampler = yield asset_swapper_1.ERC20BridgeSamplerContract.deployFrom0xArtifactAsync(asset_swapper_1.artifacts.ERC20BridgeSampler, provider, { from: account }, {});
            logger_1.logger.info(`Deployed ERC20BridgeSamplerContract on network ${chainId}: ${sampler.address}`);
            return sampler;
        }
        catch (err) {
            logger_1.logger.error(`Failed to deploy ERC20BridgeSamplerContract on network ${chainId}: ${err}`);
            throw err;
        }
    });
}
let contractAddresses_;
/**
 * Determines the contract addresses needed for the network. For testing (ganache)
 * required contracts are deployed
 * @param provider provider to the network, used for ganache deployment
 * @param chainId the network chain id
 */
function getContractAddressesForNetworkOrThrowAsync(provider, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (contractAddresses_) {
            return contractAddresses_;
        }
        let contractAddresses = contract_addresses_1.getContractAddressesForChainOrThrow(chainId);
        // In a testnet where the environment does not support overrides
        // so we deploy the latest sampler
        if (chainId === types_1.ChainId.Ganache) {
            const sampler = yield deploySamplerContractAsync(provider, chainId);
            contractAddresses = Object.assign(Object.assign({}, contractAddresses), { erc20BridgeSampler: sampler.address });
        }
        contractAddresses_ = contractAddresses;
        return contractAddresses_;
    });
}
exports.getContractAddressesForNetworkOrThrowAsync = getContractAddressesForNetworkOrThrowAsync;
/**
 * Instantiates dependencies required to run the app. Uses default settings based on config
 * @param config should contain a URI for mesh to listen to, and the ethereum RPC URL
 */
function getDefaultAppDependenciesAsync(provider, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const contractAddresses = yield getContractAddressesForNetworkOrThrowAsync(provider, config_1.CHAIN_ID);
        const connection = yield db_connection_1.getDBConnectionAsync();
        const stakingDataService = new staking_data_service_1.StakingDataService(connection);
        let meshClient;
        // hack (xianny): the Mesh client constructor has a fire-and-forget promise so we are unable
        // to catch initialisation errors. Allow the calling function to skip Mesh initialization by
        // not providing a websocket URI
        if (config.meshWebsocketUri !== undefined) {
            meshClient = new mesh_client_1.MeshClient(config.meshWebsocketUri, config.meshHttpUri);
        }
        else {
            logger_1.logger.warn(`Skipping Mesh client creation because no URI provided`);
        }
        let metricsService;
        if (config.enablePrometheusMetrics) {
            metricsService = new metrics_service_1.MetricsService();
        }
        let rateLimiter;
        if (config.metaTxnRateLimiters !== undefined) {
            rateLimiter = createMetaTransactionRateLimiterFromConfig(connection, config);
        }
        const orderBookService = new orderbook_service_1.OrderBookService(connection, meshClient);
        let swapService;
        try {
            swapService = createSwapServiceFromOrderBookService(orderBookService, provider, contractAddresses);
        }
        catch (err) {
            logger_1.logger.error(err.stack);
        }
        const metaTransactionService = createMetaTxnServiceFromOrderBookService(orderBookService, provider, connection, contractAddresses);
        const websocketOpts = { path: constants_1.SRA_PATH };
        return {
            contractAddresses,
            connection,
            stakingDataService,
            meshClient,
            orderBookService,
            swapService,
            metaTransactionService,
            provider,
            websocketOpts,
            metricsService,
            rateLimiter,
        };
    });
}
exports.getDefaultAppDependenciesAsync = getDefaultAppDependenciesAsync;
/**
 * starts the app with dependencies injected. This entry-point is used when running a single instance 0x API
 * deployment and in tests. It is not used in production deployments where scaling is required.
 * @param dependencies  all values are optional and will be filled with reasonable defaults, with one
 *                      exception. if a `meshClient` is not provided, the API will start without a
 *                      connection to mesh.
 * @return the app object
 */
function getAppAsync(dependencies, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = express();
        const { server, wsService } = yield http_service_runner_1.runHttpServiceAsync(dependencies, config, app);
        if (dependencies.meshClient !== undefined) {
            try {
                yield order_watcher_service_runner_1.runOrderWatcherServiceAsync(dependencies.connection, dependencies.meshClient);
            }
            catch (e) {
                logger_1.logger.error(`Error attempting to start Order Watcher service, [${JSON.stringify(e)}]`);
            }
        }
        else {
            logger_1.logger.warn('No mesh client provided, API running without Order Watcher');
        }
        // Register a shutdown event listener.
        // TODO: More teardown logic should be added here. For example, the mesh rpc
        // client should be destroyed and services should be torn down.
        server.on('close', () => __awaiter(this, void 0, void 0, function* () {
            yield wsService.destroyAsync();
        }));
        return { app, server };
    });
}
exports.getAppAsync = getAppAsync;
function createMetaTransactionRateLimiterFromConfig(dbConnection, config) {
    const rateLimiterConfigEntries = Object.entries(config.metaTxnRateLimiters);
    const configuredRateLimiters = rateLimiterConfigEntries
        .map(entries => {
        const [dbField, rateLimiters] = entries;
        return Object.entries(rateLimiters).map(rateLimiterEntry => {
            const [limiterType, value] = rateLimiterEntry;
            switch (limiterType) {
                case rate_limiters_1.AvailableRateLimiter.Daily: {
                    const dailyConfig = value;
                    return new rate_limiters_1.MetaTransactionDailyLimiter(dbField, dbConnection, dailyConfig);
                }
                case rate_limiters_1.AvailableRateLimiter.Rolling: {
                    const rollingConfig = value;
                    return new rate_limiters_1.MetaTransactionRollingLimiter(dbField, dbConnection, rollingConfig);
                }
                default:
                    throw new Error('unknown rate limiter type');
            }
        });
    })
        .reduce((prev, cur) => {
        return prev.concat(...cur);
    }, []);
    return new meta_transaction_composable_rate_limiter_1.MetaTransactionComposableLimiter(configuredRateLimiters);
}
/**
 * Instantiates SwapService using the provided OrderBookService and ethereum RPC provider.
 */
function createSwapServiceFromOrderBookService(orderBookService, provider, contractAddresses) {
    const orderStore = new order_store_db_adapter_1.OrderStoreDbAdapter(orderBookService);
    const orderProvider = new order_book_service_order_provider_1.OrderBookServiceOrderProvider(orderStore, orderBookService);
    const orderBook = new asset_swapper_1.Orderbook(orderProvider, orderStore);
    return new swap_service_1.SwapService(orderBook, provider, contractAddresses);
}
exports.createSwapServiceFromOrderBookService = createSwapServiceFromOrderBookService;
/**
 * Instantiates MetaTransactionService using the provided OrderBookService,
 * ethereum RPC provider and db connection.
 */
function createMetaTxnServiceFromOrderBookService(orderBookService, provider, dbConnection, contractAddresses) {
    const orderStore = new order_store_db_adapter_1.OrderStoreDbAdapter(orderBookService);
    const orderProvider = new order_book_service_order_provider_1.OrderBookServiceOrderProvider(orderStore, orderBookService);
    const orderBook = new asset_swapper_1.Orderbook(orderProvider, orderStore);
    return new meta_transaction_service_1.MetaTransactionService(orderBook, provider, dbConnection, contractAddresses);
}
exports.createMetaTxnServiceFromOrderBookService = createMetaTxnServiceFromOrderBookService;
//# sourceMappingURL=app.js.map