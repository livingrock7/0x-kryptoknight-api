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
exports.utils = void 0;
const utils_1 = require("@0x/utils");
const _ = require("lodash");
exports.utils = {
    arrayToMapWithId: (array, idKey) => {
        const initialMap = {};
        return array.reduce((acc, val) => {
            const id = val[idKey];
            acc[id] = val;
            return acc;
        }, initialMap);
    },
    /**
     * Executes JSON-RPC response validation
     * Copied from https://github.com/ethereum/web3.js/blob/79a165a205074cfdc14f59a61c41ba9ef5d25172/packages/web3-providers/src/validators/JsonRpcResponseValidator.js
     */
    isValidJsonRpcResponseOrThrow: (response, payload = undefined) => {
        if (_.isObject(response)) {
            if (response.error) {
                if (response.error instanceof Error) {
                    throw new Error(`Node error: ${response.error.message}`);
                }
                throw new Error(`Node error: ${JSON.stringify(response.error)}`);
            }
            if (payload && response.id !== payload.id) {
                throw new Error(`Validation error: Invalid JSON-RPC response ID (request: ${payload.id} / response: ${response.id})`);
            }
            if (response.result === undefined) {
                throw new Error('Validation error: Undefined JSON-RPC result');
            }
            return true;
        }
        throw new Error('Validation error: Response should be of type Object');
    },
    chunkByByteLength: (items, maxByteLength) => {
        const itemsClone = items.slice(0);
        const chunkedItems = [];
        let currChunk = [];
        let currentChunkTotalLength = 0;
        while (itemsClone.length !== 0) {
            const item = itemsClone[0];
            const currLength = Buffer.from(JSON.stringify(item)).byteLength;
            // Too big to add, reset
            if (currentChunkTotalLength + currLength > maxByteLength) {
                chunkedItems.push(currChunk);
                currChunk = [];
                currentChunkTotalLength = 0;
            }
            else {
                currChunk.push(item);
                currentChunkTotalLength += currLength;
                itemsClone.splice(0, 1);
            }
        }
        // Handle the final chunk
        if (currChunk.length !== 0) {
            chunkedItems.push(currChunk);
        }
        return chunkedItems;
    },
    delayAsync: (ms) => __awaiter(void 0, void 0, void 0, function* () {
        // tslint:disable-next-line:no-inferred-empty-object-type
        return new Promise(resolve => setTimeout(resolve, ms));
    }),
    runWithTimeout: (fn, timeoutMs) => __awaiter(void 0, void 0, void 0, function* () {
        let _timeoutHandle;
        // tslint:disable-next-line:no-inferred-empty-object-type
        const timeoutPromise = new Promise((_resolve, reject) => {
            _timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        });
        return Promise.race([fn(), timeoutPromise]).then(result => {
            clearTimeout(_timeoutHandle);
            return result;
        });
    }),
    isNil: (value) => {
        // undefined == null => true
        // undefined == undefined => true
        return value == null;
    },
    setAsyncExcludingImmediateInterval(fn, intervalMs, onError) {
        // Execute this immediately rather than wait for the first interval
        void (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield fn();
            }
            catch (e) {
                onError(e);
            }
        }))();
        return utils_1.intervalUtils.setAsyncExcludingInterval(fn, intervalMs, onError);
    },
};
//# sourceMappingURL=utils.js.map