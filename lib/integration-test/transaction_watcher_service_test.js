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
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
require("mocha");
const request = require("supertest");
const app_1 = require("../src/app");
const config_1 = require("../src/config");
const constants_1 = require("../src/constants");
const db_connection_1 = require("../src/db_connection");
const entities_1 = require("../src/entities");
const errors_1 = require("../src/errors");
const metrics_service_1 = require("../src/services/metrics_service");
const orderbook_service_1 = require("../src/services/orderbook_service");
const staking_data_service_1 = require("../src/services/staking_data_service");
const transaction_watcher_signer_service_1 = require("../src/services/transaction_watcher_signer_service");
const types_1 = require("../src/types");
const mesh_client_1 = require("../src/utils/mesh_client");
const utils_2 = require("../src/utils/utils");
const test_signer_1 = require("./utils/test_signer");
const NUMBER_OF_RETRIES = 20;
const WAIT_DELAY_IN_MS = 5000;
let app;
let transactionEntityRepository;
let txWatcher;
let connection;
let metaTxnUser;
let provider;
function _waitUntilStatusAsync(txHash, status, repository) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < NUMBER_OF_RETRIES; i++) {
            const tx = yield repository.findOne({ txHash });
            if (tx !== undefined && tx.status === status) {
                return;
            }
            yield utils_2.utils.delayAsync(WAIT_DELAY_IN_MS);
        }
        throw new Error(`failed to grab transaction: ${txHash} in a ${status} state`);
    });
}
describe('transaction watcher service', () => {
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        const providerEngine = new dev_utils_1.Web3ProviderEngine();
        providerEngine.addProvider(new subproviders_1.RPCSubprovider(config_1.ETHEREUM_RPC_URL));
        utils_1.providerUtils.startProviderEngine(providerEngine);
        provider = providerEngine;
        connection = yield db_connection_1.getDBConnectionAsync();
        const contractAddresses = yield app_1.getContractAddressesForNetworkOrThrowAsync(provider, types_1.ChainId.Ganache);
        const txWatcherConfig = {
            provider: providerEngine,
            chainId: config_1.CHAIN_ID,
            contractAddresses,
            signerPrivateKeys: config_1.META_TXN_RELAY_PRIVATE_KEYS,
            expectedMinedInSec: config_1.META_TXN_RELAY_EXPECTED_MINED_SEC,
            isSigningEnabled: config_1.META_TXN_SIGNING_ENABLED,
            maxGasPriceGwei: config_1.META_TXN_MAX_GAS_PRICE_GWEI,
            minSignerEthBalance: 0.1,
            transactionPollingIntervalMs: 100,
            heartbeatIntervalMs: 1000,
            unstickGasMultiplier: 1.1,
            numBlocksUntilConfirmed: 5,
        };
        transactionEntityRepository = connection.getRepository(entities_1.TransactionEntity);
        txWatcher = new transaction_watcher_signer_service_1.TransactionWatcherSignerService(connection, txWatcherConfig);
        yield txWatcher.syncTransactionStatusAsync();
        const orderBookService = new orderbook_service_1.OrderBookService(connection);
        const metaTransactionService = app_1.createMetaTxnServiceFromOrderBookService(orderBookService, provider, connection, contractAddresses);
        const stakingDataService = new staking_data_service_1.StakingDataService(connection);
        const websocketOpts = { path: constants_1.SRA_PATH };
        const swapService = app_1.createSwapServiceFromOrderBookService(orderBookService, provider, contractAddresses);
        const meshClient = new mesh_client_1.MeshClient(config_1.defaultHttpServiceConfig.meshWebsocketUri, config_1.defaultHttpServiceConfig.meshHttpUri);
        const metricsService = new metrics_service_1.MetricsService();
        metaTxnUser = new test_signer_1.TestMetaTxnUser();
        ({ app } = yield app_1.getAppAsync({
            contractAddresses,
            orderBookService,
            metaTransactionService,
            stakingDataService,
            connection,
            provider,
            swapService,
            meshClient,
            websocketOpts,
            metricsService,
        }, config_1.defaultHttpServiceWithRateLimiterConfig));
    }));
    it('sends a signed zeroex transaction correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        const { zeroExTransactionHash, zeroExTransaction } = yield request(app)
            .get(`${constants_1.META_TRANSACTION_PATH}/quote${metaTxnUser.getQuoteString('DAI', 'WETH', '500000000')}`)
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            return response.body;
        }));
        const signature = yield metaTxnUser.signAsync(zeroExTransactionHash);
        const txHashToRequest = yield request(app)
            .post(`${constants_1.META_TRANSACTION_PATH}/submit`)
            .set('0x-api-key', 'e20bd887-e195-4580-bca0-322607ec2a49')
            .send({ signature, zeroExTransaction })
            .expect('Content-Type', /json/)
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            contracts_test_utils_1.expect(response.body.code).to.not.equal(errors_1.GeneralErrorCodes.InvalidAPIKey);
            const { ethereumTransactionHash } = response.body;
            yield _waitUntilStatusAsync(ethereumTransactionHash, types_1.TransactionStates.Confirmed, transactionEntityRepository);
            return ethereumTransactionHash;
        }));
        yield request(app)
            .get(`${constants_1.META_TRANSACTION_PATH}/status/${txHashToRequest}`)
            .then(response => {
            contracts_test_utils_1.expect(response.body.hash).to.equal(txHashToRequest);
            contracts_test_utils_1.expect(response.body.status).to.equal('confirmed');
        });
    }));
    it('handles low gas price correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        const { zeroExTransaction } = yield request(app)
            .get(`${constants_1.META_TRANSACTION_PATH}/quote${metaTxnUser.getQuoteString('DAI', 'WETH', '500000000')}`)
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            return response.body;
        }));
        zeroExTransaction.gasPrice = '1337';
        const { signature } = yield metaTxnUser.signTransactionAsync(zeroExTransaction);
        const txHashToRequest = yield request(app)
            .post(`${constants_1.META_TRANSACTION_PATH}/submit`)
            .set('0x-api-key', 'e20bd887-e195-4580-bca0-322607ec2a49')
            .send({ signature, zeroExTransaction })
            .expect('Content-Type', /json/)
            .then((response) => __awaiter(void 0, void 0, void 0, function* () {
            contracts_test_utils_1.expect(response.body.code).to.not.equal(errors_1.GeneralErrorCodes.InvalidAPIKey);
            const { ethereumTransactionHash } = response.body;
            yield _waitUntilStatusAsync(ethereumTransactionHash, types_1.TransactionStates.Aborted, transactionEntityRepository);
            return ethereumTransactionHash;
        }));
        yield request(app)
            .get(`${constants_1.META_TRANSACTION_PATH}/status/${txHashToRequest}`)
            .then(response => {
            contracts_test_utils_1.expect(response.body.hash).to.equal(txHashToRequest);
            contracts_test_utils_1.expect(response.body.status).to.equal('aborted');
        });
        yield request(app)
            .get('/metrics')
            .then(response => {
            contracts_test_utils_1.expect(response.text).to.include('signer_transactions_count');
            contracts_test_utils_1.expect(response.text).to.include('signer_gas_price_sum');
            contracts_test_utils_1.expect(response.text).to.include('signer_eth_balance_sum');
        });
    }));
});
//# sourceMappingURL=transaction_watcher_service_test.js.map