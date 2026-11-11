/** Race a promise against a timeout; ignore late resolution after settle. */
export function withTimeout(promise, ms, label) {
  let timer;
  let settled = false;
  return Promise.race([
    Promise.resolve(promise).then(
      (value) => {
        if (settled) return value;
        settled = true;
        clearTimeout(timer);
        return value;
      },
      (err) => {
        if (settled) throw err;
        settled = true;
        clearTimeout(timer);
        throw err;
      }
    ),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]);
}
