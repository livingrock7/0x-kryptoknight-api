"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwapRouter = void 0;
const express = require("express");
const asyncHandler = require("express-async-handler");
const swap_handlers_1 = require("../handlers/swap_handlers");
const types_1 = require("../types");
// tslint:disable-next-line:completed-docs
function createSwapRouter(swapService) {
    const router = express.Router();
    const handlers = new swap_handlers_1.SwapHandlers(swapService);
    router.get('/v0', asyncHandler(swap_handlers_1.SwapHandlers.rootAsync.bind(swap_handlers_1.SwapHandlers)));
    router.get('/v0/prices', asyncHandler(handlers.getTokenPricesAsync.bind(handlers)));
    router.get('/v0/tokens', asyncHandler(handlers.getSwapTokensAsync.bind(handlers)));
    router.get('/v0/depth', asyncHandler(handlers.getMarketDepthAsync.bind(handlers)));
    router.get('/v0/quote', asyncHandler(handlers.getSwapQuoteAsync.bind(handlers, types_1.SwapVersion.V0)));
    router.get('/v0/price', asyncHandler(handlers.getSwapPriceAsync.bind(handlers, types_1.SwapVersion.V0)));
    router.get('/v1', asyncHandler(swap_handlers_1.SwapHandlers.rootAsync.bind(swap_handlers_1.SwapHandlers)));
    router.get('/v1/quote', asyncHandler(handlers.getSwapQuoteAsync.bind(handlers, types_1.SwapVersion.V1)));
    router.get('/v1/price', asyncHandler(handlers.getSwapPriceAsync.bind(handlers, types_1.SwapVersion.V1)));
    return router;
}
exports.createSwapRouter = createSwapRouter;
//# sourceMappingURL=swap_router.js.map