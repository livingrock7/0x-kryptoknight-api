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
exports.TransactionWatcherSignerService = void 0;
const contract_wrappers_1 = require("@0x/contract-wrappers");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const prom_client_1 = require("prom-client");
const typeorm_1 = require("typeorm");
const config_1 = require("../config");
const constants_1 = require("../constants");
const entities_1 = require("../entities");
const logger_1 = require("../logger");
const types_1 = require("../types");
const gas_station_utils_1 = require("../utils/gas_station_utils");
const rate_limiters_1 = require("../utils/rate-limiters");
const signer_1 = require("../utils/signer");
const utils_2 = require("../utils/utils");
const SIGNER_ADDRESS_LABEL = 'signer_address';
const TRANSACTION_STATUS_LABEL = 'status';
class TransactionWatcherSignerService {
    constructor(dbConnection, config) {
        this._signers = new Map();
        this._signerBalancesEth = new Map();
        this._config = config;
        this._rateLimiter = this._config.rateLimiter;
        this._transactionRepository = dbConnection.getRepository(entities_1.TransactionEntity);
        this._kvRepository = dbConnection.getRepository(entities_1.KeyValueEntity);
        this._web3Wrapper = new web3_wrapper_1.Web3Wrapper(config.provider);
        this._signers = new Map();
        this._contractWrappers = new contract_wrappers_1.ContractWrappers(config.provider, {
            chainId: config.chainId,
            contractAddresses: config.contractAddresses,
        });
        this._availableSignerPublicAddresses = config.signerPrivateKeys.map(key => {
            const signer = new signer_1.Signer(key, config.provider);
            this._signers.set(signer.publicAddress, signer);
            return signer.publicAddress;
        });
        this._metricsUpdateTimer = utils_2.utils.setAsyncExcludingImmediateInterval(() => __awaiter(this, void 0, void 0, function* () { return this._updateLiveSatusAsync(); }), config.heartbeatIntervalMs, (err) => {
            logger_1.logger.error({
                message: `transaction watcher failed to update metrics and heartbeat: ${JSON.stringify(err)}`,
                err: err.stack,
            });
        });
        this._transactionWatcherTimer = utils_2.utils.setAsyncExcludingImmediateInterval(() => __awaiter(this, void 0, void 0, function* () { return this.syncTransactionStatusAsync(); }), config.transactionPollingIntervalMs, (err) => {
            logger_1.logger.error({
                message: `transaction watcher failed to sync transaction status: ${JSON.stringify(err)}`,
                err: err.stack,
            });
        });
        if (config_1.ENABLE_PROMETHEUS_METRICS) {
            // Metric collection related fields
            this._signerBalancesGauge = new prom_client_1.Gauge({
                name: 'signer_eth_balance_sum',
                help: 'Available ETH Balance of a signer',
                labelNames: [SIGNER_ADDRESS_LABEL],
            });
            this._transactionsUpdateCounter = new prom_client_1.Counter({
                name: 'signer_transactions_count',
                help: 'Number of transactions updates of a signer by status',
                labelNames: [SIGNER_ADDRESS_LABEL, TRANSACTION_STATUS_LABEL],
            });
            this._gasPriceSummary = new prom_client_1.Summary({
                name: 'signer_gas_price_summary',
                help: 'Observed gas prices by the signer in gwei',
                labelNames: [SIGNER_ADDRESS_LABEL],
            });
            this._livenessGauge = new prom_client_1.Gauge({
                name: 'signer_liveness_gauge',
                help: 'Indicator of signer liveness, where 1 is ready to sign 0 is not signing',
            });
        }
    }
    static getSortedSignersByAvailability(signerMap) {
        return Array.from(signerMap.entries())
            .sort((a, b) => {
            const [, aSigner] = a;
            const [, bSigner] = b;
            // if the number of pending transactions is the same, we sort
            // the signers by their known balance.
            if (aSigner.count === bSigner.count) {
                return bSigner.balance - aSigner.balance;
            }
            // otherwise we sort by the least amount of pending transactions.
            return aSigner.count - bSigner.count;
        })
            .map(([address]) => address);
    }
    static _isUnsubmittedTxExpired(tx) {
        return tx.status === types_1.TransactionStates.Unsubmitted && Date.now() > tx.expectedAt.getTime();
    }
    stop() {
        utils_1.intervalUtils.clearAsyncExcludingInterval(this._transactionWatcherTimer);
        utils_1.intervalUtils.clearAsyncExcludingInterval(this._metricsUpdateTimer);
    }
    syncTransactionStatusAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.trace('syncing transaction status');
            try {
                yield this._cancelOrSignAndBroadcastTransactionsAsync();
            }
            catch (err) {
                logger_1.logger.error({
                    message: `failed to sign and broadcast transactions: ${JSON.stringify(err)}`,
                    stack: err.stack,
                });
            }
            yield this._syncBroadcastedTransactionStatusAsync();
            yield this._checkForStuckTransactionsAsync();
            yield this._checkForConfirmedTransactionsAsync();
        });
    }
    _signAndBroadcastMetaTxAsync(txEntity, signer) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO(oskar) refactor with type guards?
            if (utils_2.utils.isNil(txEntity.to)) {
                throw new Error('txEntity is missing to');
            }
            if (utils_2.utils.isNil(txEntity.value)) {
                throw new Error('txEntity is missing value');
            }
            if (utils_2.utils.isNil(txEntity.gasPrice)) {
                throw new Error('txEntity is missing gasPrice');
            }
            if (utils_2.utils.isNil(txEntity.data)) {
                throw new Error('txEntity is missing data');
            }
            if (!this._isSignerLiveAsync()) {
                throw new Error('signer is currently not live');
            }
            const { ethereumTxnParams, ethereumTransactionHash } = yield signer.signAndBroadcastMetaTxAsync(txEntity.to, txEntity.data, txEntity.value, txEntity.gasPrice);
            txEntity.status = types_1.TransactionStates.Submitted;
            txEntity.txHash = ethereumTransactionHash;
            txEntity.nonce = ethereumTxnParams.nonce;
            txEntity.from = ethereumTxnParams.from;
            txEntity.gas = ethereumTxnParams.gas;
            if (config_1.ENABLE_PROMETHEUS_METRICS) {
                this._gasPriceSummary.observe({ [SIGNER_ADDRESS_LABEL]: txEntity.from }, web3_wrapper_1.Web3Wrapper.toUnitAmount(txEntity.gasPrice, constants_1.GWEI_DECIMALS).toNumber());
            }
            yield this._updateTxEntityAsync(txEntity);
        });
    }
    _syncBroadcastedTransactionStatusAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionsToCheck = yield this._transactionRepository.find({
                where: [
                    { status: types_1.TransactionStates.Submitted },
                    { status: types_1.TransactionStates.Mempool },
                    { status: types_1.TransactionStates.Stuck },
                ],
            });
            logger_1.logger.trace(`found ${transactionsToCheck.length} transactions to check status`);
            for (const tx of transactionsToCheck) {
                yield this._findTransactionStatusAndUpdateAsync(tx);
            }
        });
    }
    _findTransactionStatusAndUpdateAsync(txEntity) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO(oskar) - LessThanOrEqual and LessThan do not work on dates in
            // TypeORM queries, ref: https://github.com/typeorm/typeorm/issues/3959
            const latestBlockDate = yield this._getLatestBlockDateAsync();
            const isExpired = txEntity.expectedAt <= latestBlockDate;
            if (txEntity.txHash === undefined) {
                logger_1.logger.warn('missing txHash for transaction entity');
                return txEntity;
            }
            try {
                const txInBlockchain = yield this._web3Wrapper.getTransactionByHashAsync(txEntity.txHash);
                if (txInBlockchain !== undefined && txInBlockchain !== null && txInBlockchain.hash !== undefined) {
                    if (txInBlockchain.blockNumber !== null) {
                        logger_1.logger.trace({
                            message: `a transaction with a ${txEntity.status} status is already on the blockchain, updating status to TransactionStates.Included`,
                            hash: txInBlockchain.hash,
                        });
                        txEntity.status = types_1.TransactionStates.Included;
                        txEntity.blockNumber = txInBlockchain.blockNumber;
                        yield this._updateTxEntityAsync(txEntity);
                        yield this._abortTransactionsWithTheSameNonceAsync(txEntity);
                        return txEntity;
                        // Checks if the txn is in the mempool but still has it's status set to Unsubmitted or Submitted
                    }
                    else if (!isExpired && txEntity.status !== types_1.TransactionStates.Mempool) {
                        logger_1.logger.trace({
                            message: `a transaction with a ${txEntity.status} status is pending, updating status to TransactionStates.Mempool`,
                            hash: txInBlockchain.hash,
                        });
                        txEntity.status = types_1.TransactionStates.Mempool;
                        return this._updateTxEntityAsync(txEntity);
                    }
                    else if (isExpired) {
                        // NOTE(oskar): we currently cancel all transactions that are in the
                        // "stuck" state. A better solution might be to unstick
                        // transactions one by one and observing if they unstick the
                        // subsequent transactions.
                        txEntity.status = types_1.TransactionStates.Stuck;
                        return this._updateTxEntityAsync(txEntity);
                    }
                }
            }
            catch (err) {
                if (err instanceof TypeError) {
                    // HACK(oskar): web3Wrapper.getTransactionByHashAsync throws a
                    // TypeError if the Ethereum node cannot find the transaction
                    // and returns NULL instead of the transaction object. We
                    // therefore use this to detect this case until @0x/web3-wrapper
                    // is fixed.
                    if (isExpired) {
                        txEntity.status = types_1.TransactionStates.Dropped;
                        return this._updateTxEntityAsync(txEntity);
                    }
                }
                else {
                    // if the error is not from a typeerror, we rethrow
                    throw err;
                }
            }
            return txEntity;
        });
    }
    // Sets the transaction status to 'aborted' for transactions with the same nonce as the passed in txEntity
    _abortTransactionsWithTheSameNonceAsync(txEntity) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionsToAbort = yield this._transactionRepository.find({
                where: {
                    nonce: txEntity.nonce,
                    txHash: typeorm_1.Not(txEntity.txHash),
                    from: txEntity.from,
                },
            });
            for (const tx of transactionsToAbort) {
                tx.status = types_1.TransactionStates.Aborted;
                yield this._updateTxEntityAsync(tx);
            }
            return transactionsToAbort;
        });
    }
    _getLatestBlockDateAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const latestBlockTimestamp = yield this._web3Wrapper.getBlockTimestampAsync('latest');
            return new Date(latestBlockTimestamp * constants_1.ONE_SECOND_MS);
        });
    }
    _cancelOrSignAndBroadcastTransactionsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const unsignedTransactions = yield this._transactionRepository.find({
                where: [{ status: types_1.TransactionStates.Unsubmitted }],
            });
            logger_1.logger.trace(`found ${unsignedTransactions.length} transactions to sign and broadcast`);
            for (const tx of unsignedTransactions) {
                if (this._rateLimiter !== undefined) {
                    const rateLimitResponse = yield this._rateLimiter.isAllowedAsync({
                        apiKey: tx.apiKey,
                        takerAddress: tx.takerAddress,
                    });
                    if (rate_limiters_1.isRateLimitedMetaTransactionResponse(rateLimitResponse)) {
                        logger_1.logger.warn({
                            message: `cancelling transaction because of rate limiting: ${rateLimitResponse.reason}`,
                            refHash: tx.refHash,
                            from: tx.from,
                            takerAddress: tx.takerAddress,
                            // NOTE: to not leak full keys we log only the part of
                            // the API key that was rate limited.
                            // tslint:disable-next-line:custom-no-magic-numbers
                            apiKey: tx.apiKey.substring(0, 8),
                        });
                        tx.status = types_1.TransactionStates.Cancelled;
                        yield this._updateTxEntityAsync(tx);
                        continue;
                    }
                }
                if (TransactionWatcherSignerService._isUnsubmittedTxExpired(tx)) {
                    logger_1.logger.error({
                        message: `found a transaction in an unsubmitted state waiting longer than ${constants_1.TX_HASH_RESPONSE_WAIT_TIME_MS}ms`,
                        refHash: tx.refHash,
                        from: tx.from,
                    });
                    tx.status = types_1.TransactionStates.Cancelled;
                    yield this._updateTxEntityAsync(tx);
                    continue;
                }
                try {
                    const signer = yield this._getNextSignerAsync();
                    yield this._signAndBroadcastMetaTxAsync(tx, signer);
                }
                catch (err) {
                    logger_1.logger.error({
                        message: `failed to sign and broadcast transaction ${JSON.stringify(err)}`,
                        stack: err.stack,
                        refHash: tx.refHash,
                        from: tx.from,
                    });
                }
            }
        });
    }
    _getSignerByPublicAddressOrThrow(publicAddress) {
        const signer = this._signers.get(publicAddress);
        if (signer === undefined) {
            throw new Error(`no signer available with this publicAddress: ${publicAddress}`);
        }
        return signer;
    }
    _getNextSignerAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const [selectedSigner] = yield this._getSortedSignerPublicAddressesByAvailabilityAsync();
            // TODO(oskar) - add random choice for top signers to better distribute
            // the fees.
            const signer = this._signers.get(selectedSigner);
            if (signer === undefined) {
                throw new Error(`signer with public address: ${selectedSigner} is not available`);
            }
            return signer;
        });
    }
    _getSortedSignerPublicAddressesByAvailabilityAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const signerMap = new Map();
            this._availableSignerPublicAddresses.forEach(signerAddress => {
                const count = 0;
                const balance = this._signerBalancesEth.get(signerAddress) || 0;
                signerMap.set(signerAddress, { count, balance });
            });
            // TODO(oskar) - move to query builder?
            const res = yield this._transactionRepository.query(`SELECT transactions.from, COUNT(*) FROM transactions WHERE status in ('submitted','mempool','stuck') GROUP BY transactions.from`);
            res.filter(result => {
                // we exclude from addresses that are not part of the available
                // signer pool
                return this._availableSignerPublicAddresses.includes(result.from);
            }).forEach(result => {
                const current = signerMap.get(result.from);
                signerMap.set(result.from, Object.assign(Object.assign({}, current), { count: result.count }));
            });
            return TransactionWatcherSignerService.getSortedSignersByAvailability(signerMap);
        });
    }
    _unstickTransactionAsync(tx, gasPrice, signer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tx.nonce === undefined) {
                throw new Error(`failed to unstick transaction ${tx.txHash} nonce is undefined`);
            }
            const txHash = yield signer.sendTransactionToItselfWithNonceAsync(tx.nonce, gasPrice);
            const transactionEntity = entities_1.TransactionEntity.make({
                refHash: txHash,
                txHash,
                status: types_1.TransactionStates.Submitted,
                nonce: tx.nonce,
                gasPrice,
                from: tx.from,
                to: signer.publicAddress,
                value: constants_1.ZERO,
                gas: constants_1.ETH_TRANSFER_GAS_LIMIT,
                expectedMinedInSec: this._config.expectedMinedInSec,
            });
            yield this._transactionRepository.save(transactionEntity);
            return txHash;
        });
    }
    _checkForStuckTransactionsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const stuckTransactions = yield this._transactionRepository.find({
                where: { status: types_1.TransactionStates.Stuck },
            });
            if (stuckTransactions.length === 0) {
                return;
            }
            const gasStationPrice = yield gas_station_utils_1.ethGasStationUtils.getGasPriceOrThrowAsync();
            const targetGasPrice = gasStationPrice.multipliedBy(this._config.unstickGasMultiplier);
            for (const tx of stuckTransactions) {
                if (tx.from === undefined) {
                    logger_1.logger.error({
                        message: `unsticking of transaction skipped because the from field is missing, was it removed?`,
                        txHash: tx.txHash,
                    });
                    continue;
                }
                if (!utils_2.utils.isNil(tx.gasPrice) && tx.gasPrice.isGreaterThanOrEqualTo(targetGasPrice)) {
                    logger_1.logger.warn({
                        message: 'unsticking of transaction skipped as the targetGasPrice is less than or equal to the gas price it was submitted with',
                        txHash: tx.txHash,
                        txGasPrice: tx.gasPrice,
                        targetGasPrice,
                    });
                    continue;
                }
                const signer = this._getSignerByPublicAddressOrThrow(tx.from);
                try {
                    yield this._unstickTransactionAsync(tx, targetGasPrice, signer);
                }
                catch (err) {
                    logger_1.logger.error({ message: `failed to unstick transaction ${tx.txHash}`, stack: err.stack });
                }
            }
        });
    }
    _checkForConfirmedTransactionsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            // we are checking for transactions that are already in the included
            // state, but can potentially be affected by a blockchain reorg.
            const latestBlockNumber = yield this._web3Wrapper.getBlockNumberAsync();
            const transactionsToCheck = yield this._transactionRepository.find({
                where: { status: types_1.TransactionStates.Included },
            });
            if (transactionsToCheck.length === 0) {
                return;
            }
            for (const tx of transactionsToCheck) {
                if (tx.txHash === undefined || tx.blockNumber === undefined) {
                    logger_1.logger.error({
                        mesage: 'transaction that has an included status is missing a txHash or blockNumber',
                        refHash: tx.refHash,
                        from: tx.from,
                    });
                    continue;
                }
                const txInBlockchain = yield this._web3Wrapper.getTransactionByHashAsync(tx.txHash);
                if (txInBlockchain === undefined) {
                    // transaction that was previously included is not identified by
                    // the node, we change its status to submitted and see whether
                    // or not it will appear again.
                    tx.status = types_1.TransactionStates.Submitted;
                    yield this._updateTxEntityAsync(tx);
                    continue;
                }
                if (txInBlockchain.blockNumber === null) {
                    // transaction that was previously included in a block is now
                    // showing without a blockNumber, but exists in the mempool of
                    // an ethereum node.
                    tx.status = types_1.TransactionStates.Mempool;
                    tx.blockNumber = undefined;
                    yield this._updateTxEntityAsync(tx);
                    continue;
                }
                else {
                    if (tx.blockNumber !== txInBlockchain.blockNumber) {
                        logger_1.logger.warn({
                            message: 'transaction that was included has a different blockNumber stored than the one returned from RPC',
                            previousBlockNumber: tx.blockNumber,
                            returnedBlockNumber: txInBlockchain.blockNumber,
                        });
                    }
                    if (tx.blockNumber + this._config.numBlocksUntilConfirmed < latestBlockNumber) {
                        const txReceipt = yield this._web3Wrapper.getTransactionReceiptIfExistsAsync(tx.txHash);
                        tx.status = types_1.TransactionStates.Confirmed;
                        tx.gasUsed = txReceipt.gasUsed;
                        // status type can be a string
                        tx.txStatus = utils_2.utils.isNil(txReceipt.status)
                            ? tx.txStatus
                            : new utils_1.BigNumber(txReceipt.status).toNumber();
                        yield this._updateTxEntityAsync(tx);
                    }
                }
            }
        });
    }
    _updateTxEntityAsync(txEntity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (config_1.ENABLE_PROMETHEUS_METRICS) {
                this._transactionsUpdateCounter.inc({ [SIGNER_ADDRESS_LABEL]: txEntity.from, [TRANSACTION_STATUS_LABEL]: txEntity.status }, 1);
            }
            return this._transactionRepository.save(txEntity);
        });
    }
    _updateSignerBalancesAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const balances = yield this._contractWrappers.devUtils
                    .getEthBalances(this._availableSignerPublicAddresses)
                    .callAsync();
                balances.forEach((balance, i) => this._updateSignerBalance(this._availableSignerPublicAddresses[i], balance));
            }
            catch (err) {
                logger_1.logger.error({
                    message: `failed to update signer balance: ${JSON.stringify(err)}, ${this._availableSignerPublicAddresses}`,
                    stack: err.stack,
                });
            }
        });
    }
    _updateSignerBalance(signerAddress, signerBalance) {
        const balanceInEth = web3_wrapper_1.Web3Wrapper.toUnitAmount(signerBalance, constants_1.ETH_DECIMALS).toNumber();
        this._signerBalancesEth.set(signerAddress, balanceInEth);
        if (config_1.ENABLE_PROMETHEUS_METRICS) {
            this._signerBalancesGauge.set({ [SIGNER_ADDRESS_LABEL]: signerAddress }, balanceInEth);
        }
    }
    _isSignerLiveAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            // Return immediately if the override is set to false
            if (!this._config.isSigningEnabled) {
                return false;
            }
            const currentFastGasPrice = yield gas_station_utils_1.ethGasStationUtils.getGasPriceOrThrowAsync();
            const isCurrentGasPriceBelowMax = web3_wrapper_1.Web3Wrapper.toUnitAmount(currentFastGasPrice, constants_1.GWEI_DECIMALS).lt(this._config.maxGasPriceGwei);
            const hasAvailableBalance = Array.from(this._signerBalancesEth.values()).filter(val => val > this._config.minSignerEthBalance).length >
                0;
            return hasAvailableBalance && isCurrentGasPriceBelowMax;
        });
    }
    _updateLiveSatusAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.trace('updating metrics');
            yield this._updateSignerBalancesAsync();
            logger_1.logger.trace('heartbeat');
            yield this._updateSignerStatusAsync();
        });
    }
    _updateSignerStatusAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: do we need to find the entity first, for UPDATE?
            let statusKV = yield this._kvRepository.findOne(constants_1.SIGNER_STATUS_DB_KEY);
            if (utils_2.utils.isNil(statusKV)) {
                statusKV = new entities_1.KeyValueEntity(constants_1.SIGNER_STATUS_DB_KEY);
            }
            const isLive = yield this._isSignerLiveAsync();
            this._livenessGauge.set(isLive ? 1 : 0);
            const statusContent = {
                live: isLive,
                // HACK: We save the time to force the updatedAt update else it will be a noop when state hasn't changed
                timeSinceEpoch: Date.now(),
                // tslint:disable-next-line:no-inferred-empty-object-type
                balances: Array.from(this._signerBalancesEth.entries()).reduce((acc, signerBalance) => {
                    const [from, balance] = signerBalance;
                    return Object.assign(Object.assign({}, acc), { [from]: balance });
                }, {}),
                gasPrice: web3_wrapper_1.Web3Wrapper.toUnitAmount(yield gas_station_utils_1.ethGasStationUtils.getGasPriceOrThrowAsync(), constants_1.GWEI_DECIMALS).toNumber(),
                maxGasPrice: this._config.maxGasPriceGwei.toNumber(),
            };
            statusKV.value = JSON.stringify(statusContent);
            yield this._kvRepository.save(statusKV);
        });
    }
}
exports.TransactionWatcherSignerService = TransactionWatcherSignerService;
// tslint:disable-line:max-file-line-count
//# sourceMappingURL=transaction_watcher_signer_service.js.map