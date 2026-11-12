import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt from node:crypto: no native dependencies. Stored format: scrypt$N$r$p$saltB64$hashB64.
// N=2^17, r=8 needs 128 MiB per hash (OWASP's scrypt baseline); libuv's 4 worker threads cap
// concurrent hashes, and the auth rate limits cap how often anyone can trigger one.
export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

export const PASSWORD_PARAMS: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** Refuse absurd stored parameters instead of allocating unbounded memory. */
const MAX_N = 2 ** 20;

/** scrypt needs 128 * N * r bytes; Node's default maxmem (32 MiB) is too small for N=2^17. */
const maxmemFor = ({ N, r }: ScryptParams): number => 2 * 128 * N * r;

const scryptAsync = (password: string, salt: Buffer, keylen: number, params: ScryptParams): Promise<Buffer> => {
  const options: ScryptOptions = { ...params, maxmem: maxmemFor(params) };

  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
};

interface ParsedHash {
  params: ScryptParams;
  salt: Buffer;
  hash: Buffer;
}

const parseHash = (stored: string): ParsedHash | null => {
  const [algo, n, r, p, saltB64, hashB64, ...rest] = stored.split('$');

  if (algo !== 'scrypt' || !n || !r || !p || !saltB64 || !hashB64 || rest.length > 0) return null;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  const valid = [params.N, params.r, params.p].every((v) => Number.isInteger(v) && v > 0) && params.N <= MAX_N;

  return valid ? { params, salt: Buffer.from(saltB64, 'base64'), hash: Buffer.from(hashB64, 'base64') } : null;
};

export const hashPassword = async (password: string, params: ScryptParams = PASSWORD_PARAMS): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password, salt, KEY_LENGTH, params);

  return ['scrypt', params.N, params.r, params.p, salt.toString('base64'), key.toString('base64')].join('$');
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parsed = parseHash(stored);

  if (!parsed) return false;
  const actual = await scryptAsync(password, parsed.salt, parsed.hash.length, parsed.params);

  return actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash);
};

/** True when a stored hash uses older/weaker parameters than PASSWORD_PARAMS: rehash it at the next login. */
export const needsRehash = (stored: string, params: ScryptParams = PASSWORD_PARAMS): boolean => {
  const parsed = parseHash(stored);

  if (!parsed) return true;

  return parsed.params.N !== params.N || parsed.params.r !== params.r || parsed.params.p !== params.p
    || parsed.hash.length !== KEY_LENGTH;
};

let dummyHash: Promise<string> | undefined;

/** Burns the same CPU as a real check so unknown emails are not detectable by timing. */
export const verifyAgainstDummy = async (password: string): Promise<false> => {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(password, await dummyHash);

  return false;
};
