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
exports.StakingDataService = void 0;
const _ = require("lodash");
const errors_1 = require("../errors");
const queries = require("../queries/staking_queries");
const staking_utils_1 = require("../utils/staking_utils");
const utils_1 = require("../utils/utils");
class StakingDataService {
    constructor(connection) {
        this._connection = connection;
    }
    getEpochNAsync(epochId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpoch = _.head(yield this._connection.query(queries.epochNQuery, [epochId]));
            if (!rawEpoch) {
                throw new Error(`Could not find epoch ${epochId}`);
            }
            const epoch = staking_utils_1.stakingUtils.getEpochFromRaw(rawEpoch);
            return epoch;
        });
    }
    getEpochNWithFeesAsync(epochId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpochWithFees = _.head(yield this._connection.query(queries.epochNWithFeesQuery, [epochId]));
            if (!rawEpochWithFees) {
                throw new Error(`Could not find epoch ${epochId}`);
            }
            const epoch = staking_utils_1.stakingUtils.getEpochWithFeesFromRaw(rawEpochWithFees);
            return epoch;
        });
    }
    getCurrentEpochAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpoch = _.head(yield this._connection.query(queries.currentEpochQuery));
            if (!rawEpoch) {
                throw new Error('Could not find the current epoch.');
            }
            const epoch = staking_utils_1.stakingUtils.getEpochFromRaw(rawEpoch);
            return epoch;
        });
    }
    getCurrentEpochWithFeesAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpochWithFees = _.head(yield this._connection.query(queries.currentEpochWithFeesQuery));
            if (!rawEpochWithFees) {
                throw new Error('Could not find the current epoch.');
            }
            const epoch = staking_utils_1.stakingUtils.getEpochWithFeesFromRaw(rawEpochWithFees);
            return epoch;
        });
    }
    getNextEpochAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpoch = _.head(yield this._connection.query(queries.nextEpochQuery));
            if (!rawEpoch) {
                throw new Error('Could not find the next epoch.');
            }
            const epoch = staking_utils_1.stakingUtils.getEpochFromRaw(rawEpoch);
            return epoch;
        });
    }
    getNextEpochWithFeesAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawEpoch = _.head(yield this._connection.query(queries.nextEpochQuery));
            if (!rawEpoch) {
                throw new Error('Could not find the next epoch.');
            }
            const epoch = staking_utils_1.stakingUtils.getEpochWithFeesFromRaw(rawEpoch);
            return epoch;
        });
    }
    getStakingPoolsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawPools = yield this._connection.query(queries.stakingPoolsQuery);
            const pools = staking_utils_1.stakingUtils.getPoolsFromRaw(rawPools);
            return pools;
        });
    }
    getStakingPoolAsync(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawPool = _.head(yield this._connection.query(queries.stakingPoolByIdQuery, [poolId]));
            if (!rawPool) {
                throw new errors_1.NotFoundError(`Could not find pool with pool_id ${poolId}`);
            }
            const pool = staking_utils_1.stakingUtils.getPoolFromRaw(rawPool);
            return pool;
        });
    }
    getStakingPoolEpochRewardsAsync(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawPoolEpochRewards = yield this._connection.query(queries.poolEpochRewardsQuery, [
                poolId,
            ]);
            const poolEpochRewards = staking_utils_1.stakingUtils.getPoolEpochRewardsFromRaw(rawPoolEpochRewards);
            return poolEpochRewards;
        });
    }
    getStakingPoolAllTimeRewardsAsync(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawAllTimePoolRewards = (yield this._connection.query(queries.allTimePoolRewardsQuery, [
                poolId,
            ]));
            const rawTotalPoolProtocolFeesGenerated = (yield this._connection.query(queries.poolTotalProtocolFeesGeneratedQuery, [poolId]));
            const rawAllTimePoolRewardsHead = _.head(rawAllTimePoolRewards);
            const rawTotalPoolProtocolFeesGeneratedHead = _.head(rawTotalPoolProtocolFeesGenerated);
            const allTimePoolRewards = staking_utils_1.stakingUtils.getAlltimePoolRewards(rawAllTimePoolRewardsHead, rawTotalPoolProtocolFeesGeneratedHead);
            return allTimePoolRewards;
        });
    }
    getAllTimeStakingStatsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawAllTimeStats = _.head(yield this._connection.query(queries.allTimeStatsQuery));
            if (!rawAllTimeStats) {
                throw new Error('Could not find allTime staking statistics.');
            }
            const allTimeAllTimeStats = staking_utils_1.stakingUtils.getAllTimeStakingStatsFromRaw(rawAllTimeStats);
            return allTimeAllTimeStats;
        });
    }
    getStakingPoolWithStatsAsync(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            const pool = yield this.getStakingPoolAsync(poolId);
            const rawCurrentEpochPoolStats = yield this._connection.query(queries.currentEpochPoolStatsQuery, [poolId]);
            const rawNextEpochPoolStats = yield this._connection.query(queries.nextEpochPoolStatsQuery, [poolId]);
            const rawPoolSevenDayProtocolFeesGenerated = yield this._connection.query(queries.poolSevenDayProtocolFeesGeneratedQuery, [poolId]);
            const rawAvgReward = yield this._connection.query(queries.poolAvgRewardsQuery, [poolId]);
            const currentEpochPoolStats = staking_utils_1.stakingUtils.getEpochPoolStatsFromRaw(rawCurrentEpochPoolStats[0]);
            const nextEpochPoolStats = staking_utils_1.stakingUtils.getEpochPoolStatsFromRaw(rawNextEpochPoolStats[0]);
            const pool7dProtocolFeesGenerated = staking_utils_1.stakingUtils.getPoolProtocolFeesGeneratedFromRaw(rawPoolSevenDayProtocolFeesGenerated[0]);
            const poolAvgReward = staking_utils_1.stakingUtils.getPoolAvgRewardsFromRaw(rawAvgReward[0]);
            return Object.assign(Object.assign({}, pool), { sevenDayProtocolFeesGeneratedInEth: pool7dProtocolFeesGenerated.sevenDayProtocolFeesGeneratedInEth, avgMemberRewardInEth: poolAvgReward.avgMemberRewardInEth, avgTotalRewardInEth: poolAvgReward.avgTotalRewardInEth, avgMemberRewardEthPerZrx: poolAvgReward.avgMemberRewardEthPerZrx, currentEpochStats: currentEpochPoolStats, nextEpochStats: nextEpochPoolStats });
        });
    }
    getStakingPoolsWithStatsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const pools = yield this.getStakingPoolsAsync();
            const rawCurrentEpochPoolStats = yield this._connection.query(queries.currentEpochPoolsStatsQuery);
            const rawNextEpochPoolStats = yield this._connection.query(queries.nextEpochPoolsStatsQuery);
            const rawPoolSevenDayProtocolFeesGenerated = yield this._connection.query(queries.sevenDayProtocolFeesGeneratedQuery);
            const rawPoolsAvgRewards = yield this._connection.query(queries.poolsAvgRewardsQuery);
            const currentEpochPoolStats = staking_utils_1.stakingUtils.getEpochPoolsStatsFromRaw(rawCurrentEpochPoolStats);
            const nextEpochPoolStats = staking_utils_1.stakingUtils.getEpochPoolsStatsFromRaw(rawNextEpochPoolStats);
            const poolProtocolFeesGenerated = staking_utils_1.stakingUtils.getPoolsProtocolFeesGeneratedFromRaw(rawPoolSevenDayProtocolFeesGenerated);
            const poolAvgRewards = staking_utils_1.stakingUtils.getPoolsAvgRewardsFromRaw(rawPoolsAvgRewards);
            const currentEpochPoolStatsMap = utils_1.utils.arrayToMapWithId(currentEpochPoolStats, 'poolId');
            const nextEpochPoolStatsMap = utils_1.utils.arrayToMapWithId(nextEpochPoolStats, 'poolId');
            const poolProtocolFeesGeneratedMap = utils_1.utils.arrayToMapWithId(poolProtocolFeesGenerated, 'poolId');
            const poolAvgRewardsMap = utils_1.utils.arrayToMapWithId(poolAvgRewards, 'poolId');
            return pools.map(pool => (Object.assign(Object.assign({}, pool), { sevenDayProtocolFeesGeneratedInEth: poolProtocolFeesGeneratedMap[pool.poolId].sevenDayProtocolFeesGeneratedInEth, avgMemberRewardInEth: poolAvgRewardsMap[pool.poolId].avgMemberRewardInEth, avgTotalRewardInEth: poolAvgRewardsMap[pool.poolId].avgTotalRewardInEth, avgMemberRewardEthPerZrx: poolAvgRewardsMap[pool.poolId].avgMemberRewardEthPerZrx, currentEpochStats: currentEpochPoolStatsMap[pool.poolId], nextEpochStats: nextEpochPoolStatsMap[pool.poolId] })));
        });
    }
    getDelegatorCurrentEpochAsync(delegatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawDelegatorDeposited = (yield this._connection.query(queries.currentEpochDelegatorDepositedQuery, [
                delegatorAddress,
            ]));
            const rawDelegatorStaked = (yield this._connection.query(queries.currentEpochDelegatorStakedQuery, [
                delegatorAddress,
            ]));
            const zrxDeposited = staking_utils_1.stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
            const { zrxStaked, poolData } = staking_utils_1.stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);
            return {
                zrxDeposited,
                zrxStaked,
                poolData,
            };
        });
    }
    getDelegatorNextEpochAsync(delegatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawDelegatorDeposited = (yield this._connection.query(queries.nextEpochDelegatorDepositedQuery, [
                delegatorAddress,
            ]));
            const rawDelegatorStaked = (yield this._connection.query(queries.nextEpochDelegatorStakedQuery, [
                delegatorAddress,
            ]));
            const zrxDeposited = staking_utils_1.stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
            const { zrxStaked, poolData } = staking_utils_1.stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);
            return {
                zrxDeposited,
                zrxStaked,
                poolData,
            };
        });
    }
    getDelegatorEventsAsync(delegatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawDelegatorEvents = yield this._connection.query(queries.delegatorEventsQuery, [
                delegatorAddress,
            ]);
            const delegatorEvents = staking_utils_1.stakingUtils.getDelegatorEventsFromRaw(rawDelegatorEvents);
            return delegatorEvents;
        });
    }
    getDelegatorAllTimeStatsAsync(delegatorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawDelegatorAllTimeStats = yield this._connection.query(queries.allTimeDelegatorStatsQuery, [
                delegatorAddress,
            ]);
            const poolData = staking_utils_1.stakingUtils.getDelegatorAllTimeStatsFromRaw(rawDelegatorAllTimeStats);
            return {
                poolData,
            };
        });
    }
}
exports.StakingDataService = StakingDataService;
//# sourceMappingURL=staking_data_service.js.map