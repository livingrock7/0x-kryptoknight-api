"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetaTransactionRouter = void 0;
const express = require("express");
const asyncHandler = require("express-async-handler");
const meta_transaction_handlers_1 = require("../handlers/meta_transaction_handlers");
exports.createMetaTransactionRouter = (metaTransactionService, rateLimiter) => {
    const router = express.Router();
    const handlers = new meta_transaction_handlers_1.MetaTransactionHandlers(metaTransactionService, rateLimiter);
    router.get('/', asyncHandler(meta_transaction_handlers_1.MetaTransactionHandlers.rootAsync.bind(meta_transaction_handlers_1.MetaTransactionHandlers)));
    /**
     * GET price endpoint returns the price the taker can expect to receive by
     * calling /quote
     */
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    /**
     * GET quote endpoint returns an unsigned 0x Transaction that when sent to
     * `executeTransaction` will execute a specified swap.
     *
     * https://0x.org/docs/guides/v3-specification#transaction-message-format
     */
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));
    /**
     * GET status endpoint retrieves the transaction status by its hash.
     */
    router.get('/status/:txHash', asyncHandler(handlers.getTransactionStatusAsync.bind(handlers)));
    /**
     * POST Transaction endpoint takes a signed 0x Transaction and sends it to Ethereum
     * for execution via `executeTransaction`.
     *
     * https://0x.org/docs/guides/v3-specification#executing-a-transaction
     */
    router.post('/submit', asyncHandler(handlers.submitZeroExTransactionIfWhitelistedAsync.bind(handlers)));
    router.get('/signer/status', asyncHandler(handlers.getSignerStatusAsync.bind(handlers)));
    return router;
};
//# sourceMappingURL=meta_transaction_router.js.map