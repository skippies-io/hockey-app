const KEY = "hj:user";

function randomKey() {
  return `hj_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getUserKey() {
  try {
    let key = localStorage.getItem(KEY);
    if (!key) {
      key = randomKey();
      localStorage.setItem(KEY, key);
    }
    return key;
  } catch {
    return randomKey();
  }
}
