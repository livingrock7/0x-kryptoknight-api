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
exports.StakingHandlers = void 0;
const HttpStatus = require("http-status-codes");
const schemas_1 = require("../schemas/schemas");
const schema_utils_1 = require("../utils/schema_utils");
class StakingHandlers {
    constructor(stakingDataService) {
        this._stakingDataService = stakingDataService;
    }
    getStakingPoolsAsync(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const stakingPools = yield this._stakingDataService.getStakingPoolsWithStatsAsync();
            const response = {
                stakingPools,
            };
            res.status(HttpStatus.OK).send(response);
        });
    }
    getStakingPoolByIdAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const poolId = req.params.id;
            const pool = yield this._stakingDataService.getStakingPoolWithStatsAsync(poolId);
            const epochRewards = yield this._stakingDataService.getStakingPoolEpochRewardsAsync(poolId);
            const allTimeStats = yield this._stakingDataService.getStakingPoolAllTimeRewardsAsync(poolId);
            const response = {
                poolId,
                stakingPool: Object.assign(Object.assign({}, pool), { allTimeStats,
                    epochRewards }),
            };
            res.status(HttpStatus.OK).send(response);
        });
    }
    getStakingEpochNAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // optional query string to include fees
            schema_utils_1.schemaUtils.validateSchema(req.query, schemas_1.schemas.stakingEpochRequestSchema);
            const isWithFees = req.query.withFees ? req.query.withFees === 'true' : false;
            const n = Number(req.params.n);
            let response;
            if (isWithFees) {
                const epoch = yield this._stakingDataService.getEpochNWithFeesAsync(n);
                response = epoch;
            }
            else {
                const epoch = yield this._stakingDataService.getEpochNAsync(n);
                response = epoch;
            }
            res.status(HttpStatus.OK).send(response);
        });
    }
    getStakingEpochsAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // optional query string to include fees
            schema_utils_1.schemaUtils.validateSchema(req.query, schemas_1.schemas.stakingEpochRequestSchema);
            const isWithFees = req.query.withFees ? req.query.withFees === 'true' : false;
            let response;
            if (isWithFees) {
                const currentEpoch = yield this._stakingDataService.getCurrentEpochWithFeesAsync();
                const nextEpoch = yield this._stakingDataService.getNextEpochWithFeesAsync();
                response = {
                    currentEpoch,
                    nextEpoch,
                };
            }
            else {
                const currentEpoch = yield this._stakingDataService.getCurrentEpochAsync();
                const nextEpoch = yield this._stakingDataService.getNextEpochAsync();
                response = {
                    currentEpoch,
                    nextEpoch,
                };
            }
            res.status(HttpStatus.OK).send(response);
        });
    }
    getStakingStatsAsync(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTimeStakingStats = yield this._stakingDataService.getAllTimeStakingStatsAsync();
            const response = {
                allTime: allTimeStakingStats,
            };
            res.status(HttpStatus.OK).send(response);
        });
    }
    getDelegatorAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const delegatorAddress = req.params.id;
            const normalizedAddress = delegatorAddress && delegatorAddress.toLowerCase();
            const forCurrentEpoch = yield this._stakingDataService.getDelegatorCurrentEpochAsync(normalizedAddress);
            const forNextEpoch = yield this._stakingDataService.getDelegatorNextEpochAsync(normalizedAddress);
            const allTime = yield this._stakingDataService.getDelegatorAllTimeStatsAsync(normalizedAddress);
            const response = {
                delegatorAddress,
                forCurrentEpoch,
                forNextEpoch,
                allTime,
            };
            res.status(HttpStatus.OK).send(response);
        });
    }
    getDelegatorEventsAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const delegatorAddress = req.params.id;
            const normalizedAddress = delegatorAddress && delegatorAddress.toLowerCase();
            const delegatorEvents = yield this._stakingDataService.getDelegatorEventsAsync(normalizedAddress);
            const response = delegatorEvents;
            res.status(HttpStatus.OK).send(response);
        });
    }
}
exports.StakingHandlers = StakingHandlers;
//# sourceMappingURL=staking_handlers.js.map