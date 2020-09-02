"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteReportUtils = void 0;
const _ = require("lodash");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
exports.quoteReportUtils = {
    logQuoteReport(logOpts) {
        const qr = logOpts.quoteReport;
        let logBase = {
            firmQuoteReport: true,
            submissionBy: logOpts.submissionBy,
        };
        if (logOpts.submissionBy === 'metaTxn') {
            logBase = Object.assign(Object.assign({}, logBase), { zeroExTransactionHash: logOpts.zeroExTransactionHash });
        }
        else if (logOpts.submissionBy === 'taker') {
            logBase = Object.assign(Object.assign({}, logBase), { decodedUniqueId: logOpts.decodedUniqueId });
        }
        // Deliver in chunks since Kibana can't handle logs large requests
        const sourcesConsideredChunks = _.chunk(qr.sourcesConsidered, constants_1.NUMBER_SOURCES_PER_LOG_LINE);
        sourcesConsideredChunks.forEach((chunk, i) => {
            logger_1.logger.info(Object.assign(Object.assign({}, logBase), { sourcesConsidered: chunk, sourcesConsideredChunkIndex: i, sourcesConsideredChunkLength: sourcesConsideredChunks.length }));
        });
        const sourcesDeliveredChunks = _.chunk(qr.sourcesDelivered, constants_1.NUMBER_SOURCES_PER_LOG_LINE);
        sourcesDeliveredChunks.forEach((chunk, i) => {
            logger_1.logger.info(Object.assign(Object.assign({}, logBase), { sourcesDelivered: chunk, sourcesDeliveredChunkIndex: i, sourcesDeliveredChunkLength: sourcesDeliveredChunks.length }));
        });
    },
};
//# sourceMappingURL=quote_report_utils.js.map