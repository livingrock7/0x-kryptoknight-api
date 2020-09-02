"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStakingRouter = void 0;
const express = require("express");
const asyncHandler = require("express-async-handler");
const staking_handlers_1 = require("../handlers/staking_handlers");
// tslint:disable-next-line:completed-docs
function createStakingRouter(stakingDataService) {
    const router = express.Router();
    const handlers = new staking_handlers_1.StakingHandlers(stakingDataService);
    router.get('/pools/:id', asyncHandler(handlers.getStakingPoolByIdAsync.bind(handlers)));
    router.get('/pools', asyncHandler(handlers.getStakingPoolsAsync.bind(handlers)));
    router.get('/epochs/:n', asyncHandler(handlers.getStakingEpochNAsync.bind(handlers)));
    router.get('/epochs', asyncHandler(handlers.getStakingEpochsAsync.bind(handlers)));
    router.get('/stats', asyncHandler(handlers.getStakingStatsAsync.bind(handlers)));
    router.get('/delegator/:id', asyncHandler(handlers.getDelegatorAsync.bind(handlers)));
    router.get('/delegator/events/:id', asyncHandler(handlers.getDelegatorEventsAsync.bind(handlers)));
    return router;
}
exports.createStakingRouter = createStakingRouter;
//# sourceMappingURL=staking_router.js.map