"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationUtils = void 0;
const config_1 = require("../config");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
exports.paginationUtils = {
    paginate: (collection, page, perPage) => {
        const paginatedCollection = {
            total: collection.length,
            page,
            perPage,
            records: collection.slice((page - 1) * perPage, page * perPage),
        };
        return paginatedCollection;
    },
    parsePaginationConfig: (req) => {
        const page = req.query.page === undefined ? constants_1.DEFAULT_PAGE : Number(req.query.page);
        const perPage = req.query.perPage === undefined ? constants_1.DEFAULT_PER_PAGE : Number(req.query.perPage);
        if (perPage > config_1.MAX_PER_PAGE) {
            throw new errors_1.ValidationError([
                {
                    field: 'perPage',
                    code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                    reason: `perPage should be less or equal to ${config_1.MAX_PER_PAGE}`,
                },
            ]);
        }
        return { page, perPage };
    },
};
//# sourceMappingURL=pagination_utils.js.map