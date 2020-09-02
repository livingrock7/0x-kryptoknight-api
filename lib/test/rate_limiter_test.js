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
const utils_1 = require("@0x/utils");
require("mocha");
const entities_1 = require("../src/entities");
const types_1 = require("../src/types");
const parse_utils_1 = require("../src/utils/parse_utils");
const rate_limiters_1 = require("../src/utils/rate-limiters");
const meta_transaction_composable_rate_limiter_1 = require("../src/utils/rate-limiters/meta_transaction_composable_rate_limiter");
const meta_transaction_value_limiter_1 = require("../src/utils/rate-limiters/meta_transaction_value_limiter");
const db_connection_1 = require("./utils/db_connection");
const deployment_1 = require("./utils/deployment");
const SUITE_NAME = 'rate limiter tests';
const TEST_API_KEY = 'test-key';
const TEST_FIRST_TAKER_ADDRESS = 'one';
const TEST_SECOND_TAKER_ADDRESS = 'two';
const DAILY_LIMIT = 10;
let connection;
let transactionRepository;
let dailyLimiter;
let rollingLimiter;
let composedLimiter;
let rollingLimiterForTakerAddress;
let rollingValueLimiter;
function* intGenerator() {
    let i = 0;
    while (true) {
        yield i++;
    }
}
const intGen = intGenerator();
const newTx = (apiKey, takerAddress, values) => {
    const tx = entities_1.TransactionEntity.make({
        to: '',
        refHash: utils_1.hexUtils.hash(intGen.next().value),
        takerAddress: takerAddress === undefined ? TEST_FIRST_TAKER_ADDRESS : takerAddress,
        apiKey,
        status: types_1.TransactionStates.Submitted,
        expectedMinedInSec: 123,
    });
    if (values !== undefined) {
        const { value, gasPrice, gasUsed } = values;
        tx.gasPrice = new utils_1.BigNumber(gasPrice);
        tx.gasUsed = gasUsed;
        tx.value = new utils_1.BigNumber(value);
    }
    return tx;
};
const generateNewTransactionsForKey = (apiKey, numberOfTransactions, takerAddress, values) => {
    const txes = [];
    for (let i = 0; i < numberOfTransactions; i++) {
        const tx = newTx(apiKey, takerAddress, values);
        txes.push(tx);
    }
    return txes;
};
// NOTE: Because TypeORM does not allow us to override entities createdAt
// directly, we resort to a raw query.
const backdateTransactions = (txes, num, unit) => __awaiter(void 0, void 0, void 0, function* () {
    const txesString = txes.map(tx => `'${tx.refHash}'`).join(',');
    yield transactionRepository.query(`UPDATE transactions SET created_at = now() - interval '${num} ${unit}' WHERE transactions.ref_hash IN (${txesString});`);
});
const cleanTransactions = () => __awaiter(void 0, void 0, void 0, function* () {
    yield transactionRepository.query('DELETE FROM transactions;');
});
describe(SUITE_NAME, () => {
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.setupDependenciesAsync(SUITE_NAME);
        connection = yield db_connection_1.getTestDBConnectionAsync();
        transactionRepository = connection.getRepository(entities_1.TransactionEntity);
        dailyLimiter = new rate_limiters_1.MetaTransactionDailyLimiter(rate_limiters_1.DatabaseKeysUsedForRateLimiter.ApiKey, connection, {
            allowedDailyLimit: DAILY_LIMIT,
        });
        rollingLimiter = new rate_limiters_1.MetaTransactionRollingLimiter(rate_limiters_1.DatabaseKeysUsedForRateLimiter.ApiKey, connection, {
            allowedLimit: 10,
            intervalNumber: 1,
            intervalUnit: rate_limiters_1.RollingLimiterIntervalUnit.Hours,
        });
        rollingLimiterForTakerAddress = new rate_limiters_1.MetaTransactionRollingLimiter(rate_limiters_1.DatabaseKeysUsedForRateLimiter.TakerAddress, connection, {
            allowedLimit: 2,
            intervalNumber: 1,
            intervalUnit: rate_limiters_1.RollingLimiterIntervalUnit.Minutes,
        });
        rollingValueLimiter = new meta_transaction_value_limiter_1.MetaTransactionRollingValueLimiter(rate_limiters_1.DatabaseKeysUsedForRateLimiter.TakerAddress, connection, {
            allowedLimitEth: 1,
            intervalNumber: 1,
            intervalUnit: rate_limiters_1.RollingLimiterIntervalUnit.Hours,
        });
        composedLimiter = new meta_transaction_composable_rate_limiter_1.MetaTransactionComposableLimiter([
            dailyLimiter,
            rollingLimiter,
            rollingLimiterForTakerAddress,
        ]);
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.teardownDependenciesAsync(SUITE_NAME);
    }));
    describe('api key daily rate limiter', () => __awaiter(void 0, void 0, void 0, function* () {
        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };
        it('should not trigger within limit', () => __awaiter(void 0, void 0, void 0, function* () {
            const firstCheck = yield dailyLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(firstCheck.isAllowed).to.be.true();
            yield transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT - 1));
            const secondCheck = yield dailyLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(secondCheck.isAllowed).to.be.true();
        }));
        it('should not trigger for other api keys', () => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionRepository.save(generateNewTransactionsForKey('0ther-key', DAILY_LIMIT));
            const { isAllowed } = yield dailyLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(isAllowed).to.be.true();
        }));
        it('should not trigger because of keys from a day before', () => __awaiter(void 0, void 0, void 0, function* () {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT);
            yield transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            yield backdateTransactions(txes, 24, 'hours');
            const { isAllowed } = yield dailyLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(isAllowed).to.be.true();
        }));
        it('should trigger after limit', () => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, 1));
            const { isAllowed } = yield dailyLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(isAllowed).to.be.false();
        }));
    }));
    describe('api rolling rate limiter', () => __awaiter(void 0, void 0, void 0, function* () {
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            yield cleanTransactions();
        }));
        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };
        it('shoult not trigger within limit', () => __awaiter(void 0, void 0, void 0, function* () {
            const firstCheck = yield rollingLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(firstCheck.isAllowed).to.be.true();
            yield transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT - 1));
            const secondCheck = yield rollingLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(secondCheck.isAllowed).to.be.true();
        }));
        it('should not trigger because of keys from an interval before', () => __awaiter(void 0, void 0, void 0, function* () {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT);
            yield transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            yield backdateTransactions(txes, 61, 'minutes');
            const { isAllowed } = yield rollingLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(isAllowed).to.be.true();
        }));
        it('should trigger after limit', () => __awaiter(void 0, void 0, void 0, function* () {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 1);
            yield transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            yield backdateTransactions(txes, 15, 'minutes');
            const { isAllowed } = yield rollingLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(isAllowed).to.be.false();
        }));
    }));
    describe('api composable rate limiter', () => {
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            yield cleanTransactions();
        }));
        const firstTakerContext = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };
        const secondTakerContext = { apiKey: TEST_API_KEY, takerAddress: TEST_SECOND_TAKER_ADDRESS };
        it('should not trigger within limits', () => __awaiter(void 0, void 0, void 0, function* () {
            const firstCheck = yield composedLimiter.isAllowedAsync(secondTakerContext);
            contracts_test_utils_1.expect(firstCheck.isAllowed).to.be.true();
        }));
        it('should trigger for the first taker address, but not the second', () => __awaiter(void 0, void 0, void 0, function* () {
            // tslint:disable-next-line:custom-no-magic-numbers
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 2, TEST_FIRST_TAKER_ADDRESS);
            yield transactionRepository.save(txes);
            const firstTakerCheck = yield composedLimiter.isAllowedAsync(firstTakerContext);
            contracts_test_utils_1.expect(firstTakerCheck.isAllowed).to.be.false();
            const secondTakerCheck = yield composedLimiter.isAllowedAsync(secondTakerContext);
            contracts_test_utils_1.expect(secondTakerCheck.isAllowed).to.be.true();
        }));
        it('should trigger all rate limiters', () => __awaiter(void 0, void 0, void 0, function* () {
            // tslint:disable-next-line:custom-no-magic-numbers
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 20, TEST_SECOND_TAKER_ADDRESS);
            yield transactionRepository.save(txes);
            const check = yield composedLimiter.isAllowedAsync(secondTakerContext);
            contracts_test_utils_1.expect(check.isAllowed).to.be.false();
        }));
    });
    describe('value rate limiter', () => {
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            yield cleanTransactions();
        }));
        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_SECOND_TAKER_ADDRESS };
        // tslint:disable:custom-no-magic-numbers
        it('should not trigger when under value limit', () => __awaiter(void 0, void 0, void 0, function* () {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 5, TEST_SECOND_TAKER_ADDRESS, {
                value: Math.pow(10, 17),
                gasPrice: Math.pow(10, 9),
                gasUsed: 400000,
            });
            yield transactionRepository.save(txes);
            const check = yield rollingValueLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(check.isAllowed).to.be.true();
        }));
        it('should trigger when over value limit', () => __awaiter(void 0, void 0, void 0, function* () {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 10, TEST_SECOND_TAKER_ADDRESS, {
                value: Math.pow(10, 18),
                gasPrice: Math.pow(10, 9),
                gasUsed: 400000,
            });
            yield transactionRepository.save(txes);
            const check = yield rollingValueLimiter.isAllowedAsync(context);
            contracts_test_utils_1.expect(check.isAllowed).to.be.false();
        }));
        // tslint:enable:custom-no-magic-numbers
    });
    describe('parser utils', () => {
        it('should throw on invalid json string', () => {
            const configString = '<html></html>';
            contracts_test_utils_1.expect(() => {
                parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw('Unexpected token < in JSON at position 0');
        });
        it('should throw on invalid configuration', () => {
            const configString = '{"api_key":{"daily": true}}';
            contracts_test_utils_1.expect(() => {
                parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw('Expected allowedDailyLimit to be of type number, encountered: undefined');
        });
        it('should throw on invalid enum in rolling configuration', () => {
            const configString = '{"api_key":{"rolling": {"allowedLimit":1,"intervalNumber":1,"intervalUnit":"months"}}}';
            contracts_test_utils_1.expect(() => {
                parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw("Expected intervalUnit to be one of: 'hours', 'minutes', encountered: months");
        });
        it('should throw on an unsupported database key', () => {
            const config = {
                api_key: {},
                taker_address: {},
                private_key: {},
            };
            contracts_test_utils_1.expect(() => {
                parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(JSON.stringify(config));
            }).to.throw("Expected dbField to be one of: 'api_key', 'taker_address', encountered: private_key");
        });
        it('should parse daily configuration properly', () => {
            const expectedDailyConfig = { allowedDailyLimit: 1 };
            const configString = `{"api_key":{"daily": ${JSON.stringify(expectedDailyConfig)}}}`;
            const config = parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            contracts_test_utils_1.expect(config.api_key.daily).to.be.deep.equal(expectedDailyConfig);
        });
        it('should parse rolling configuration properly', () => {
            const expectedRollingConfig = { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' };
            const configString = `{"api_key":{"rolling": ${JSON.stringify(expectedRollingConfig)}}}`;
            const config = parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            contracts_test_utils_1.expect(config.api_key.rolling).to.be.deep.equal(expectedRollingConfig);
        });
        it('should parse rolling value configuration properly', () => {
            const expectedRollingValueConfig = { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' };
            const configString = `{"api_key":{"rollingValue": ${JSON.stringify(expectedRollingValueConfig)}}}`;
            const config = parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            contracts_test_utils_1.expect(config.api_key.rollingValue).to.be.deep.equal(expectedRollingValueConfig);
        });
        it('should parse a full configuration', () => {
            const expectedConfig = {
                api_key: {
                    daily: { allowedDailyLimit: 1 },
                    rolling: { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' },
                    rollingValue: { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' },
                },
                taker_address: {
                    daily: { allowedDailyLimit: 1 },
                    rolling: { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' },
                    rollingValue: { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' },
                },
            };
            const parsedConfig = parse_utils_1.parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(JSON.stringify(expectedConfig));
            contracts_test_utils_1.expect(parsedConfig).to.be.deep.equal(expectedConfig);
        });
    });
});
//# sourceMappingURL=rate_limiter_test.js.map