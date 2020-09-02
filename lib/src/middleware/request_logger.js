"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const HttpStatus = require("http-status-codes");
const logger_1 = require("../logger");
/**
 * log middleware
 */
function requestLogger() {
    const handler = (req, res, next) => {
        const origSend = res.send;
        let cachedBody;
        res.send = (body) => {
            cachedBody = body;
            return origSend.bind(res)(body);
        };
        const startTime = Date.now();
        function writeLog() {
            const responseTime = Date.now() - startTime;
            res.removeListener('finish', writeLog);
            res.removeListener('close', writeLog);
            const logMsg = {
                req: {
                    url: req.originalUrl.split('?')[0],
                    method: req.method,
                    headers: {
                        '0x-api-key': req.headers['0x-api-key'],
                        'user-agent': req.headers['user-agent'],
                        host: req.headers.host,
                        referer: req.headers.referer,
                    },
                    body: req.body,
                    params: req.params,
                    query: req.query,
                },
                res: {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    errorBody: res.statusCode >= HttpStatus.BAD_REQUEST ? cachedBody : undefined,
                },
                responseTime,
                timestamp: Date.now(),
            };
            logger_1.logger.info(logMsg);
        }
        res.on('finish', writeLog);
        res.on('close', writeLog);
        next();
    };
    return handler;
}
exports.requestLogger = requestLogger;
//# sourceMappingURL=request_logger.js.map