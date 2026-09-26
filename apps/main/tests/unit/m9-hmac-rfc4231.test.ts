import { test, expect } from 'vitest';
import { hmacSha256, sha256 } from '../../src/shared/utils/crypto.js';

const case1 = {
  key: Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex'),
  data: Buffer.from('Hi There'),
  digest: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
};

const case2 = {
  key: Buffer.from('4a656665', 'hex'),
  data: Buffer.from('what do ya want for nothing?'),
  digest: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
};

const case3 = {
  key: Buffer.alloc(20, 0xaa),
  data: Buffer.alloc(50, 0xdd),
  digest: '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
};

const case4 = {
  key: Buffer.from(Array.from({ length: 25 }, (_, i) => i + 1)),
  data: Buffer.alloc(50, 0xcd),
  digest: '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
};

const case6 = {
  key: Buffer.alloc(131, 0xaa),
  data: Buffer.from('Test Using Larger Than Block-Size Key - Hash Key First'),
  digest: '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
};

const case7 = {
  key: Buffer.alloc(131, 0xaa),
  data: Buffer.from(
    'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
  ),
  digest: '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
};

const vectors = {
  '1 (20-byte 0x0b key, "Hi There")': case1,
  '2 ("Jefe" key)': case2,
  '3': case3,
  '4': case4,
  '6': case6,
  '7': case7,
};

test.each(Object.entries(vectors))(
  'RFC 4231 HMAC-SHA256 test case %s matches the published digest',
  (_name, { key, data, digest }) => {
    expect(hmacSha256(key, data)).toBe(digest);
  },
);

test("string inputs match Node's canonical createHmac over the same UTF-8 strings", () => {
  const pairs: Array<[string, string]> = [
    ['Jefe', 'what do ya want for nothing?'],
    ['', 'empty key'],
    ['ключ-ключ', 'данные с юникодом'],
    ['a'.repeat(300), 'data much longer than the block size '.repeat(10)],
  ];
  for (const [key, data] of pairs) {
    expect(hmacSha256(key, data)).toBe(hmacSha256(Buffer.from(key), Buffer.from(data)));
  }
});

test('the output is NOT a length-extension-style concat hash (the pre-fix bug)', () => {
  const key = Buffer.from('Jefe');
  const data = Buffer.from('what do ya want for nothing?');
  const naive = sha256(Buffer.concat([data, key]).toString('utf8'));
  expect(hmacSha256(key, data)).not.toBe(naive);
  expect(hmacSha256(data, key)).not.toBe(naive);
});
