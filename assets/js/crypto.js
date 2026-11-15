// SHA-256 síncrono en JS puro (entrada ASCII). Se usa para el sorteo
// auditable: antes de vender se publica sha256(semilla); al sortear se
// revela la semilla y cualquiera puede recalcular el ganador.

export function sha256(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a));
  const maxWord = 2 ** 32;
  let result = '';
  const words = [];
  const bitLen = ascii.length * 8;
  const hash0 = [], k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let c = 2; primeCounter < 64; c++) {
    if (!isComposite[c]) {
      for (let i = 0; i < 313; i += c) isComposite[i] = c;
      hash0[primeCounter] = (Math.pow(c, .5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
    }
  }
  let hash = hash0.slice(0, 8);
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    if (j >> 8) throw new Error('sha256: solo ASCII');
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const old = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
        (w[i] = i < 16 ? (w[i] | 0) : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function randomSeed() {
  const a = new Uint8Array(32);
  (globalThis.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256 | 0));
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// Ganador = números vendidos ordenados [ sha256(semilla:id:cantidad) mod cantidad ]
export function pickWinner(seed, causeId, soldSorted) {
  const n = soldSorted.length;
  const digest = sha256(`${seed}:${causeId}:${n}`);
  const idx = Number(BigInt('0x' + digest) % BigInt(n));
  return { digest, idx, number: soldSorted[idx] };
}

// PRNG determinista para datos de ejemplo
export function prng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
