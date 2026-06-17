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
exports.logHighlight = exports.logError = exports.logInfo = exports.logDebug = void 0;
const core = __importStar(require("@actions/core"));
const logDecorator = (logFn, decFn) => (message) => logFn(decFn(message));
const dateTimeDecorator = (m) => `[${new Date().toLocaleString()}] ${m}`;
exports.logDebug = logDecorator(core.debug, dateTimeDecorator);
exports.logInfo = logDecorator(core.info, dateTimeDecorator);
exports.logError = logDecorator(core.error, dateTimeDecorator);
// Foreground-only styling avoids dark background blocks in GitHub Actions logs.
const HIGHLIGHT_LABEL = '\u001b[1m';
const HIGHLIGHT_VALUE = '\u001b[1;34m';
const HIGHLIGHT_RESET = '\u001b[0m';
function logHighlight(label, value) {
    return `${HIGHLIGHT_LABEL} ${label} ${HIGHLIGHT_VALUE}${value}${HIGHLIGHT_RESET}`;
}
exports.logHighlight = logHighlight;
