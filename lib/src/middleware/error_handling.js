"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRevertError = exports.isAPIError = exports.errorHandler = exports.generateError = void 0;
const HttpStatus = require("http-status-codes");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
/**
 * Wraps an Error with a JSON human readable reason and status code.
 */
function generateError(err) {
    // handle named errors
    if (isAPIError(err)) {
        const statusCode = err.statusCode;
        // populate more information for BAD_REQUEST errors
        if (isBadRequestError(err)) {
            const code = err.generalErrorCode;
            // populate validation error information
            if (isValidationError(err)) {
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: errors_1.generalErrorCodeToReason[code],
                        validationErrors: err.validationErrors,
                    },
                };
            }
            else if (isRevertAPIError(err)) {
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: err.name,
                        values: err.values,
                    },
                };
            }
            else {
                // if not a validation error, populate the error body with standard bad request text
                return {
                    statusCode,
                    errorBody: {
                        code,
                        reason: errors_1.generalErrorCodeToReason[code],
                    },
                };
            }
        }
        else {
            // all named errors that are not BAD_REQUEST
            // preserve the statusCode and populate the error body with standard status text
            return {
                statusCode,
                errorBody: {
                    reason: HttpStatus.getStatusText(statusCode),
                },
            };
        }
    }
    else {
        // coerce unnamed errors into generic INTERNAL_SERVER_ERROR
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorBody: {
                reason: err.message,
            },
        };
    }
}
exports.generateError = generateError;
/**
 * Catches errors thrown by our code and serialies them
 */
function errorHandler(err, _req, res, next) {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response to the client)
    // the Express default error handler closes the connection and fails the request.
    if (res.headersSent) {
        return next(err);
    }
    const { statusCode, errorBody } = generateError(err);
    res.status(statusCode).send(errorBody);
    // If the error is an internal error, log it with the stack!
    // All other error responses are logged as part of request logging
    if (isAPIError(err) && isInternalServerError(err)) {
        // hack (xianny): typeorm errors contain the SQL query which breaks the docker char limit and subsequently breaks log parsing
        if (err.query) {
            err.query = undefined;
        }
        logger_1.logger.error(err);
        next(err);
    }
}
exports.errorHandler = errorHandler;
// tslint:disable-next-line:completed-docs
function isAPIError(error) {
    return error.isAPIError;
}
exports.isAPIError = isAPIError;
// tslint:disable-next-line:completed-docs
function isRevertError(error) {
    const { signature, selector } = error;
    return signature !== undefined && selector !== undefined;
}
exports.isRevertError = isRevertError;
function isBadRequestError(error) {
    return error.statusCode === HttpStatus.BAD_REQUEST;
}
function isRevertAPIError(error) {
    return error.isRevertError;
}
function isInternalServerError(error) {
    return error.statusCode === HttpStatus.INTERNAL_SERVER_ERROR;
}
function isValidationError(error) {
    return error.generalErrorCode === errors_1.GeneralErrorCodes.ValidationError;
}
//# sourceMappingURL=error_handling.js.map