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
exports.httpPostAsync = exports.httpGetAsync = exports.constructRoute = void 0;
const httpRequest = require("supertest");
const API_HTTP_ADDRESS = 'http://localhost:3000';
/**
 * Constructs a 0x-api route based on a proto route.
 * @param protoRoute The data that specifies a 0x-api route.
 */
function constructRoute(protoRoute) {
    const queryArray = protoRoute.queryParams ? Object.entries(protoRoute.queryParams) : [];
    if (!queryArray.length) {
        return protoRoute.baseRoute;
    }
    const stringifiedQueryParams = queryArray.map(([param, value]) => `${param}=${value}`).join('&');
    return `${protoRoute.baseRoute}?${stringifiedQueryParams}`;
}
exports.constructRoute = constructRoute;
/**
 * Makes a HTTP GET request.
 * @param input Specifies the route and the base URL that should be used to make
 *        the HTTP GET request.
 */
function httpGetAsync(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return httpRequest(input.baseURL || API_HTTP_ADDRESS).get(input.route);
    });
}
exports.httpGetAsync = httpGetAsync;
/**
 * Makes a HTTP POST request.
 * @param input Specifies the route and the base URL that should be used to make
 *        the HTTP POST request.
 */
function httpPostAsync(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = httpRequest(input.baseURL || API_HTTP_ADDRESS)
            .post(input.route)
            .send(input.body);
        if (input.headers) {
            for (const [field, value] of Object.entries(input.headers)) {
                request.set(field, value);
            }
        }
        return request;
    });
}
exports.httpPostAsync = httpPostAsync;
//# sourceMappingURL=http_utils.js.map