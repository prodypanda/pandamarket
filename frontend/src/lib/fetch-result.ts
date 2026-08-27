export type FetchResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'not_found' }
  | { status: 'error'; error: string; statusCode?: number };
