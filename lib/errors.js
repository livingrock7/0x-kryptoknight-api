"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketServiceError = exports.OrderWatcherSyncError = exports.ExpiredOrderError = exports.AlertError = exports.ValidationErrorReasons = exports.ValidationErrorCodes = exports.generalErrorCodeToReason = exports.GeneralErrorCodes = exports.InsufficientFundsError = exports.RevertAPIError = exports.InternalServerError = exports.NotFoundError = exports.InvalidAPIKeyError = exports.NotImplementedError = exports.TooManyRequestsError = exports.MalformedJSONError = exports.ValidationError = exports.BadRequestError = exports.APIBaseError = void 0;
const HttpStatus = require("http-status-codes");
const constants_1 = require("./constants");
// tslint:disable:max-classes-per-file
// base class for all the named errors in this file
class APIBaseError extends Error {
    constructor() {
        super(...arguments);
        this.isAPIError = true;
    }
}
exports.APIBaseError = APIBaseError;
class BadRequestError extends APIBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.BAD_REQUEST;
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends BadRequestError {
    constructor(validationErrors) {
        super();
        this.generalErrorCode = GeneralErrorCodes.ValidationError;
        this.validationErrors = validationErrors;
    }
}
exports.ValidationError = ValidationError;
class MalformedJSONError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.generalErrorCode = GeneralErrorCodes.MalformedJson;
    }
}
exports.MalformedJSONError = MalformedJSONError;
class TooManyRequestsError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.TOO_MANY_REQUESTS;
        this.generalErrorCode = GeneralErrorCodes.Throttled;
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class NotImplementedError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.NOT_IMPLEMENTED;
        this.generalErrorCode = GeneralErrorCodes.NotImplemented;
    }
}
exports.NotImplementedError = NotImplementedError;
class InvalidAPIKeyError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.BAD_REQUEST;
        this.generalErrorCode = GeneralErrorCodes.InvalidAPIKey;
    }
}
exports.InvalidAPIKeyError = InvalidAPIKeyError;
class NotFoundError extends APIBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.NOT_FOUND;
    }
}
exports.NotFoundError = NotFoundError;
class InternalServerError extends APIBaseError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
exports.InternalServerError = InternalServerError;
class RevertAPIError extends BadRequestError {
    constructor(revertError) {
        super();
        this.statusCode = HttpStatus.BAD_REQUEST;
        this.generalErrorCode = GeneralErrorCodes.TransactionInvalid;
        this.isRevertError = true;
        this.name = revertError.name;
        this.values = revertError.values;
    }
}
exports.RevertAPIError = RevertAPIError;
class InsufficientFundsError extends BadRequestError {
    constructor() {
        super(...arguments);
        this.statusCode = HttpStatus.BAD_REQUEST;
        this.generalErrorCode = GeneralErrorCodes.InsufficientFundsError;
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
var GeneralErrorCodes;
(function (GeneralErrorCodes) {
    GeneralErrorCodes[GeneralErrorCodes["ValidationError"] = 100] = "ValidationError";
    GeneralErrorCodes[GeneralErrorCodes["MalformedJson"] = 101] = "MalformedJson";
    GeneralErrorCodes[GeneralErrorCodes["OrderSubmissionDisabled"] = 102] = "OrderSubmissionDisabled";
    GeneralErrorCodes[GeneralErrorCodes["Throttled"] = 103] = "Throttled";
    GeneralErrorCodes[GeneralErrorCodes["NotImplemented"] = 104] = "NotImplemented";
    GeneralErrorCodes[GeneralErrorCodes["TransactionInvalid"] = 105] = "TransactionInvalid";
    GeneralErrorCodes[GeneralErrorCodes["UnableToSubmitOnBehalfOfTaker"] = 106] = "UnableToSubmitOnBehalfOfTaker";
    GeneralErrorCodes[GeneralErrorCodes["InvalidAPIKey"] = 107] = "InvalidAPIKey";
    GeneralErrorCodes[GeneralErrorCodes["ServiceDisabled"] = 108] = "ServiceDisabled";
    GeneralErrorCodes[GeneralErrorCodes["InsufficientFundsError"] = 109] = "InsufficientFundsError";
})(GeneralErrorCodes = exports.GeneralErrorCodes || (exports.GeneralErrorCodes = {}));
exports.generalErrorCodeToReason = {
    [GeneralErrorCodes.ValidationError]: 'Validation Failed',
    [GeneralErrorCodes.MalformedJson]: 'Malformed JSON',
    [GeneralErrorCodes.OrderSubmissionDisabled]: 'Order submission disabled',
    [GeneralErrorCodes.Throttled]: 'Throttled',
    [GeneralErrorCodes.NotImplemented]: 'Not Implemented',
    [GeneralErrorCodes.TransactionInvalid]: 'Transaction Invalid',
    [GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker]: 'Unable to submit transaction on behalf of taker',
    [GeneralErrorCodes.InvalidAPIKey]: 'Invalid API key',
    [GeneralErrorCodes.ServiceDisabled]: 'Service disabled',
    [GeneralErrorCodes.InsufficientFundsError]: 'Insufficient funds for transaction',
};
var ValidationErrorCodes;
(function (ValidationErrorCodes) {
    ValidationErrorCodes[ValidationErrorCodes["RequiredField"] = 1000] = "RequiredField";
    ValidationErrorCodes[ValidationErrorCodes["IncorrectFormat"] = 1001] = "IncorrectFormat";
    ValidationErrorCodes[ValidationErrorCodes["InvalidAddress"] = 1002] = "InvalidAddress";
    ValidationErrorCodes[ValidationErrorCodes["AddressNotSupported"] = 1003] = "AddressNotSupported";
    ValidationErrorCodes[ValidationErrorCodes["ValueOutOfRange"] = 1004] = "ValueOutOfRange";
    ValidationErrorCodes[ValidationErrorCodes["InvalidSignatureOrHash"] = 1005] = "InvalidSignatureOrHash";
    ValidationErrorCodes[ValidationErrorCodes["UnsupportedOption"] = 1006] = "UnsupportedOption";
    ValidationErrorCodes[ValidationErrorCodes["InvalidOrder"] = 1007] = "InvalidOrder";
    ValidationErrorCodes[ValidationErrorCodes["InternalError"] = 1008] = "InternalError";
    ValidationErrorCodes[ValidationErrorCodes["TokenNotSupported"] = 1009] = "TokenNotSupported";
    ValidationErrorCodes[ValidationErrorCodes["FieldInvalid"] = 1010] = "FieldInvalid";
})(ValidationErrorCodes = exports.ValidationErrorCodes || (exports.ValidationErrorCodes = {}));
var ValidationErrorReasons;
(function (ValidationErrorReasons) {
    ValidationErrorReasons["PercentageOutOfRange"] = "MUST_BE_LESS_THAN_OR_EQUAL_TO_ONE";
    ValidationErrorReasons["ConflictingFilteringArguments"] = "CONFLICTING_FILTERING_ARGUMENTS";
    ValidationErrorReasons["ArgumentNotYetSupported"] = "ARGUMENT_NOT_YET_SUPPORTED";
    ValidationErrorReasons["InvalidApiKey"] = "INVALID_API_KEY";
    ValidationErrorReasons["TakerAddressInvalid"] = "TAKER_ADDRESS_INVALID";
    ValidationErrorReasons["RequiresIntentOnFilling"] = "REQUIRES_INTENT_ON_FILLING";
})(ValidationErrorReasons = exports.ValidationErrorReasons || (exports.ValidationErrorReasons = {}));
class AlertError {
    constructor() {
        this.shouldAlert = true;
    }
}
exports.AlertError = AlertError;
class ExpiredOrderError extends AlertError {
    constructor(order, currentThreshold, details) {
        super();
        this.order = order;
        this.currentThreshold = currentThreshold;
        this.details = details;
        this.message = `Found expired order!`;
        this.expiry = order.expirationTimeSeconds.toNumber();
        this.expiredForSeconds = Date.now() / constants_1.ONE_SECOND_MS - this.expiry;
    }
}
exports.ExpiredOrderError = ExpiredOrderError;
class OrderWatcherSyncError extends AlertError {
    constructor(details) {
        super();
        this.details = details;
        this.message = `Error syncing OrderWatcher!`;
    }
}
exports.OrderWatcherSyncError = OrderWatcherSyncError;
class WebsocketServiceError extends AlertError {
    constructor(error) {
        super();
        this.error = error;
        this.message = 'Error in the Websocket service!';
    }
}
exports.WebsocketServiceError = WebsocketServiceError;
//# sourceMappingURL=errors.js.map