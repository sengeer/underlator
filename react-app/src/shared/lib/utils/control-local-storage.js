export function getStorageWrite(name) {
  try {
    return JSON.parse(localStorage.getItem(name));
  } catch {
    return '';
  }
}

export function addStorageWrite(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
}

export function clearAllStorageWrite() {
  localStorage.clear();
}
