export function getStorageWrite(name: string) {
  const item = localStorage.getItem(name);
  if (item === null) return '';
  try {
    return JSON.parse(item);
  } catch {
    return '';
  }
}

export function setStorageWrite(name: string, data: any) {
  localStorage.setItem(name, JSON.stringify(data));
}

export function clearAllStorageWrite() {
  localStorage.clear();
}
