import * as core from '@actions/core'

const logDecorator =
  (
    logFn: (message: string) => void,
    decFn: (message: string) => string
  ): ((message: string) => void) =>
  (message: string) =>
    logFn(decFn(message))

const dateTimeDecorator = (m: string): string =>
  `[${new Date().toLocaleString()}] ${m}`

export const logDebug = logDecorator(core.debug, dateTimeDecorator)
export const logInfo = logDecorator(core.info, dateTimeDecorator)
export const logError = logDecorator(core.error, dateTimeDecorator)

// Foreground-only styling avoids dark background blocks in GitHub Actions logs.
const HIGHLIGHT_LABEL = '\u001b[1m'
const HIGHLIGHT_VALUE = '\u001b[1;34m'
const HIGHLIGHT_RESET = '\u001b[0m'

export function logHighlight(label: string, value: string | number): string {
  return `${HIGHLIGHT_LABEL} ${label} ${HIGHLIGHT_VALUE}${value}${HIGHLIGHT_RESET}`
}
