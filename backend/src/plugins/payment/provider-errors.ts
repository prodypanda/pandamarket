import axios from 'axios';
import { PdError, PdErrorCode } from '../../errors';

export type ProviderInitState = 'not_created' | 'unknown';

/**
 * A response-bearing provider error means the gateway rejected the request.
 * A transport failure after the request began is ambiguous: the gateway may
 * have created a session even though the client did not receive the response.
 */
export function classifyProviderInitState(
  error: unknown,
  requestStarted: boolean,
): ProviderInitState {
  if (error instanceof PdError) {
    const state = error.details?.provider_state;
    if (state === 'unknown' || state === 'not_created') return state;
  }
  if (!requestStarted) return 'not_created';
  if (typeof axios.isAxiosError === 'function' && axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (typeof status === 'number' && status >= 400 && status < 500 && status !== 409) {
      return 'not_created';
    }
    return 'unknown';
  }
  return 'unknown';
}

export function providerInitFailure(
  gateway: string,
  message: string,
  error: unknown,
  requestStarted: boolean,
  stateOverride?: ProviderInitState,
): PdError {
  const providerState = stateOverride || classifyProviderInitState(error, requestStarted);
  return new PdError(PdErrorCode.PAY_INIT_FAILED, message, 502, {
    gateway,
    provider_state: providerState,
    retryable: providerState === 'unknown',
  });
}
