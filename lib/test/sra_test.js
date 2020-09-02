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
const contract_addresses_1 = require("@0x/contract-addresses");
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
require("mocha");
const config = require("../src/config");
const constants_1 = require("../src/constants");
const db_connection_1 = require("../src/db_connection");
const errors_1 = require("../src/errors");
const order_utils_2 = require("../src/utils/order_utils");
const deployment_1 = require("./utils/deployment");
const http_utils_1 = require("./utils/http_utils");
const mesh_test_utils_1 = require("./utils/mesh_test_utils");
const SUITE_NAME = 'Standard Relayer API (SRA) tests';
const EMPTY_PAGINATED_RESPONSE = {
    perPage: constants_1.DEFAULT_PER_PAGE,
    page: constants_1.DEFAULT_PAGE,
    total: 0,
    records: [],
};
const TOMORROW = new utils_1.BigNumber(Date.now() + 24 * 3600); // tslint:disable-line:custom-no-magic-numbers
function addNewSignedOrderAsync(orderFactory, params, remainingFillableAssetAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const order = yield orderFactory.newSignedOrderAsync(Object.assign({ expirationTimeSeconds: TOMORROW }, params));
        const apiOrder = {
            order,
            metaData: {
                orderHash: order_utils_1.orderHashUtils.getOrderHash(order),
                remainingFillableTakerAssetAmount: remainingFillableAssetAmount || order.takerAssetAmount,
            },
        };
        yield (yield db_connection_1.getDBConnectionAsync()).manager.save(order_utils_2.orderUtils.serializeOrder(apiOrder));
        return apiOrder;
    });
}
describe(SUITE_NAME, () => {
    let chainId;
    let contractAddresses;
    let makerAddress;
    let blockchainLifecycle;
    let provider;
    let weth;
    let zrx;
    let orderFactory;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.setupApiAsync(SUITE_NAME);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = dev_utils_1.web3Factory.getRpcProvider(ganacheConfigs);
        const web3Wrapper = new web3_wrapper_1.Web3Wrapper(provider);
        blockchainLifecycle = new dev_utils_1.BlockchainLifecycle(web3Wrapper);
        const accounts = yield web3Wrapper.getAvailableAddressesAsync();
        [makerAddress] = accounts;
        chainId = yield web3Wrapper.getChainIdAsync();
        contractAddresses = contract_addresses_1.getContractAddressesForChainOrThrow(chainId);
        weth = new contracts_erc20_1.WETH9Contract(contractAddresses.etherToken, provider);
        zrx = new contracts_erc20_1.DummyERC20TokenContract(contractAddresses.zrxToken, provider);
        const defaultOrderParams = Object.assign(Object.assign({}, contracts_test_utils_1.constants.STATIC_ORDER_PARAMS), { makerAddress, feeRecipientAddress: contracts_test_utils_1.constants.NULL_ADDRESS, makerAssetData: order_utils_1.assetDataUtils.encodeERC20AssetData(zrx.address), takerAssetData: order_utils_1.assetDataUtils.encodeERC20AssetData(weth.address), makerAssetAmount: mesh_test_utils_1.DEFAULT_MAKER_ASSET_AMOUNT, makerFeeAssetData: '0x', takerFeeAssetData: '0x', makerFee: contracts_test_utils_1.constants.ZERO_AMOUNT, takerFee: contracts_test_utils_1.constants.ZERO_AMOUNT, exchangeAddress: contractAddresses.exchange, chainId });
        const privateKey = contracts_test_utils_1.constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        orderFactory = new contracts_test_utils_1.OrderFactory(privateKey, defaultOrderParams);
        yield blockchainLifecycle.startAsync();
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.teardownApiAsync(SUITE_NAME);
    }));
    describe('/fee_recipients', () => {
        it('should return the list of fee recipients', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/fee_recipients` });
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.type).to.eq('application/json');
            contracts_test_utils_1.expect(response.body).to.deep.eq(Object.assign(Object.assign({}, EMPTY_PAGINATED_RESPONSE), { total: 1, records: [constants_1.NULL_ADDRESS] }));
        }));
    });
    describe('/orders', () => {
        it('should return empty response when no orders', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/orders` });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(EMPTY_PAGINATED_RESPONSE);
        }));
        it('should return orders in the local cache', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/orders` });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(Object.assign(Object.assign({}, EMPTY_PAGINATED_RESPONSE), { total: 1, records: [JSON.parse(JSON.stringify(apiOrder))] }));
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
        }));
        it('should return orders filtered by query params', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({
                route: `${constants_1.SRA_PATH}/orders?makerAddress=${apiOrder.order.makerAddress}`,
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(Object.assign(Object.assign({}, EMPTY_PAGINATED_RESPONSE), { total: 1, records: [JSON.parse(JSON.stringify(apiOrder))] }));
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
        }));
        it('should return empty response when filtered by query params', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/orders?makerAddress=${constants_1.NULL_ADDRESS}` });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(EMPTY_PAGINATED_RESPONSE);
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
        }));
        it('should normalize addresses to lowercase', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({
                route: `${constants_1.SRA_PATH}/orders?makerAddress=${apiOrder.order.makerAddress.toUpperCase()}`,
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(Object.assign(Object.assign({}, EMPTY_PAGINATED_RESPONSE), { total: 1, records: [JSON.parse(JSON.stringify(apiOrder))] }));
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
        }));
    });
    describe('GET /order', () => {
        it('should return order by order hash', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/order/${apiOrder.metaData.orderHash}` });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(JSON.parse(JSON.stringify(apiOrder)));
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
        }));
        it('should return 404 if order is not found', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            yield (yield db_connection_1.getDBConnectionAsync()).manager.remove(order_utils_2.orderUtils.serializeOrder(apiOrder));
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/order/${apiOrder.metaData.orderHash}` });
            contracts_test_utils_1.expect(response.status).to.deep.eq(HttpStatus.NOT_FOUND);
        }));
    });
    describe('GET /asset_pairs', () => {
        it('should respond to GET request', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/asset_pairs` });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body.perPage).to.equal(constants_1.DEFAULT_PER_PAGE);
            contracts_test_utils_1.expect(response.body.page).to.equal(constants_1.DEFAULT_PAGE);
            contracts_test_utils_1.expect(response.body.total).to.be.an('number');
            contracts_test_utils_1.expect(response.body.records).to.be.an('array');
        }));
    });
    describe('GET /orderbook', () => {
        it('should return orderbook for a given pair', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({
                route: http_utils_1.constructRoute({
                    baseRoute: `${constants_1.SRA_PATH}/orderbook`,
                    queryParams: {
                        baseAssetData: apiOrder.order.makerAssetData,
                        quoteAssetData: apiOrder.order.takerAssetData,
                    },
                }),
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            const expectedResponse = {
                bids: EMPTY_PAGINATED_RESPONSE,
                asks: Object.assign(Object.assign({}, EMPTY_PAGINATED_RESPONSE), { total: 1, records: [JSON.parse(JSON.stringify(apiOrder))] }),
            };
            contracts_test_utils_1.expect(response.body).to.deep.eq(expectedResponse);
        }));
        it('should return empty response if no matching orders', () => __awaiter(void 0, void 0, void 0, function* () {
            const apiOrder = yield addNewSignedOrderAsync(orderFactory, {});
            const response = yield http_utils_1.httpGetAsync({
                route: http_utils_1.constructRoute({
                    baseRoute: `${constants_1.SRA_PATH}/orderbook`,
                    queryParams: { baseAssetData: apiOrder.order.makerAssetData, quoteAssetData: constants_1.NULL_ADDRESS },
                }),
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq({
                bids: EMPTY_PAGINATED_RESPONSE,
                asks: EMPTY_PAGINATED_RESPONSE,
            });
        }));
        it('should return validation error if query params are missing', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${constants_1.SRA_PATH}/orderbook?quoteAssetData=WETH` });
            const validationErrors = {
                code: 100,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        field: 'instance.quoteAssetData',
                        code: 1001,
                        reason: 'does not match pattern "^0x(([0-9a-f][0-9a-f])+)?$"',
                    },
                    {
                        field: 'baseAssetData',
                        code: 1000,
                        reason: 'requires property "baseAssetData"',
                    },
                ],
            };
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.BAD_REQUEST);
            contracts_test_utils_1.expect(response.body).to.deep.eq(validationErrors);
        }));
    });
    describe('POST /order_config', () => {
        it('should return 200 on success', () => __awaiter(void 0, void 0, void 0, function* () {
            const order = yield orderFactory.newSignedOrderAsync();
            const expectedResponse = {
                senderAddress: constants_1.NULL_ADDRESS,
                feeRecipientAddress: constants_1.NULL_ADDRESS,
                makerFee: '0',
                takerFee: '0',
                makerFeeAssetData: '0x',
                takerFeeAssetData: '0x',
            };
            const response = yield http_utils_1.httpPostAsync({
                route: `${constants_1.SRA_PATH}/order_config`,
                body: Object.assign(Object.assign({}, order), { expirationTimeSeconds: TOMORROW }),
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body).to.deep.eq(expectedResponse);
        }));
        it('should return informative error when missing fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const order = yield orderFactory.newSignedOrderAsync();
            const validationError = {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.ValidationError],
                validationErrors: [
                    {
                        field: 'takerAddress',
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'requires property "takerAddress"',
                    },
                    {
                        field: 'expirationTimeSeconds',
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'requires property "expirationTimeSeconds"',
                    },
                ],
            };
            const response = yield http_utils_1.httpPostAsync({
                route: `${constants_1.SRA_PATH}/order_config`,
                body: Object.assign(Object.assign({}, order), { takerAddress: undefined, expirationTimeSeconds: undefined }),
            });
            contracts_test_utils_1.expect(response.type).to.eq(`application/json`);
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.BAD_REQUEST);
            contracts_test_utils_1.expect(response.body).to.deep.eq(validationError);
        }));
    });
    describe('POST /order', () => {
        let meshUtils;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
            yield meshUtils.setupUtilsAsync();
        }));
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            blockchainLifecycle.startAsync();
        }));
        afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
            yield deployment_1.teardownMeshAsync(SUITE_NAME);
            yield deployment_1.setupMeshAsync(SUITE_NAME);
            blockchainLifecycle.revertAsync();
        }));
        it('should return HTTP OK on success', () => __awaiter(void 0, void 0, void 0, function* () {
            const order = yield orderFactory.newSignedOrderAsync({
                expirationTimeSeconds: TOMORROW,
            });
            const orderHash = order_utils_1.orderHashUtils.getOrderHash(order);
            const response = yield http_utils_1.httpPostAsync({
                route: `${constants_1.SRA_PATH}/order`,
                body: Object.assign({ chainId }, order),
            });
            contracts_test_utils_1.expect(response.status).to.eq(HttpStatus.OK);
            const meshOrders = yield meshUtils.getOrdersAsync();
            contracts_test_utils_1.expect(meshOrders.ordersInfos.find(info => info.orderHash === orderHash)).to.not.be.undefined();
        }));
    });
});
//# sourceMappingURL=sra_test.js.map