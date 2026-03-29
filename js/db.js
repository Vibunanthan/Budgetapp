const DB = (() => {
  const DB_NAME = 'BudgetTrackerDB';
  const DB_VERSION = 1;
  const STORE = 'entries';
  let db;

  function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        const store = database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-type', 'type', { unique: false });
        store.createIndex('by-date', 'date', { unique: false });
        store.createIndex('by-type-date', ['type', 'date'], { unique: false });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  function store(mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function addEntry(entry) {
    return new Promise((resolve, reject) => {
      const req = store('readwrite').add({ ...entry, createdAt: Date.now() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function updateEntry(id, updates) {
    return new Promise((resolve, reject) => {
      const s = store('readwrite');
      const getReq = s.get(id);
      getReq.onsuccess = () => {
        const putReq = s.put({ ...getReq.result, ...updates });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  function deleteEntry(id) {
    return new Promise((resolve, reject) => {
      const req = store('readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function getAllEntries() {
    return new Promise((resolve, reject) => {
      const req = store('readonly').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getEntriesByDateRange(start, end) {
    return new Promise((resolve, reject) => {
      const req = store('readonly').index('by-date').getAll(IDBKeyRange.bound(start, end));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getEntriesByType(type) {
    return new Promise((resolve, reject) => {
      const req = store('readonly').index('by-type').getAll(IDBKeyRange.only(type));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getEntriesByTypeAndDateRange(type, start, end) {
    return new Promise((resolve, reject) => {
      const req = store('readonly').index('by-type-date').getAll(IDBKeyRange.bound([type, start], [type, end]));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function clearAll() {
    return new Promise((resolve, reject) => {
      const req = store('readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function bulkAdd(entries) {
    const existing = await getAllEntries();
    const keys = new Set(existing.map(e => `${e.type}|${e.date}|${e.amount}|${e.description}`));
    const toAdd = entries.filter(e => !keys.has(`${e.type}|${e.date}|${e.amount}|${e.description}`));
    if (!toAdd.length) return { added: 0, skipped: entries.length };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const s = tx.objectStore(STORE);
      toAdd.forEach(e => s.add({ ...e, createdAt: Date.now() }));
      tx.oncomplete = () => resolve({ added: toAdd.length, skipped: entries.length - toAdd.length });
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    init, addEntry, updateEntry, deleteEntry,
    getAllEntries, getEntriesByDateRange, getEntriesByType,
    getEntriesByTypeAndDateRange, clearAll, bulkAdd
  };
})();
