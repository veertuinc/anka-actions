"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAxiosError = void 0;
const axios = __importStar(require("axios"));
const SENSITIVE_HEADER_NAMES = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'proxy-authorization',
    'x-api-key',
    'x-auth-token'
]);
const SENSITIVE_FIELD_NAMES = new Set([
    'token',
    'password',
    'secret',
    'passphrase',
    'startup_script',
    'gh-pat',
    'gh_pat',
    'controller-auth-cert',
    'controller-auth-cert-key',
    'controller-root-token'
]);
const REDACTED = '[REDACTED]';
function redactHeaderName(name) {
    return SENSITIVE_HEADER_NAMES.has(name.toLowerCase());
}
function redactFieldName(name) {
    return SENSITIVE_FIELD_NAMES.has(name.toLowerCase());
}
function redactValue(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                return redactValue(JSON.parse(trimmed));
            }
            catch (_a) {
                return value;
            }
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(item => redactValue(item));
    }
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [
            key,
            redactFieldName(key) ? REDACTED : redactValue(fieldValue)
        ]));
    }
    return value;
}
function redactHeaders(headers) {
    if (!headers) {
        return undefined;
    }
    return Object.fromEntries(Object.entries(headers).map(([name, value]) => [
        name,
        redactHeaderName(name) ? REDACTED : value
    ]));
}
function formatRequest(config) {
    var _a, _b;
    if (!config) {
        return {};
    }
    const request = {
        method: (_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
        url: axios.default.getUri(config)
    };
    const headers = redactHeaders(config.headers);
    if (headers && Object.keys(headers).length > 0) {
        request.headers = headers;
    }
    if (config.auth) {
        request.auth = {
            username: (_b = config.auth.username) !== null && _b !== void 0 ? _b : '',
            password: config.auth.password ? REDACTED : undefined
        };
    }
    if (config.data !== undefined && config.data !== '') {
        request.body = redactValue(config.data);
    }
    if (config.params && Object.keys(config.params).length > 0) {
        request.params = redactValue(config.params);
    }
    return request;
}
function formatResponse(response) {
    return {
        status: response.status,
        statusText: response.statusText,
        headers: redactHeaders(response.headers),
        body: redactValue(response.data)
    };
}
function createAxiosError(error) {
    if (!(error instanceof axios.AxiosError)) {
        if (error instanceof Error) {
            return error;
        }
        return new Error(String(error));
    }
    if (error.response) {
        const details = {
            request: formatRequest(error.config),
            response: formatResponse(error.response)
        };
        return new Error(`HTTP request failed: ${JSON.stringify(details, null, 2)}`);
    }
    if (error.request) {
        const details = {
            request: formatRequest(error.config),
            message: error.message
        };
        return new Error(`HTTP request failed (no response): ${JSON.stringify(details, null, 2)}`);
    }
    return new Error(error.message);
}
exports.createAxiosError = createAxiosError;
