const DATABASE_NAME = 'handy-assigned-work-orders';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'encrypted-orders';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OBJECT_STORE)) {
        database.createObjectStore(OBJECT_STORE, { keyPath: 'assignmentId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offline storage unavailable.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offline storage request failed.'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Offline storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Offline storage transaction was aborted.'));
  });
}

function newRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function deriveKey(code, salt, assignmentId, workOrderId) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure offline encryption is not supported by this browser.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(code), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode(`HandySystem:assigned-order:v1:${assignmentId}:${workOrderId}`),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPayload(code, record, payload) {
  const salt = record.salt ? new Uint8Array(record.salt) : newRandomBytes(16);
  const iv = newRandomBytes(12);
  const key = await deriveKey(code, salt, record.assignmentId, record.workOrderId);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  return {
    assignmentId: record.assignmentId,
    workOrderId: record.workOrderId,
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    version: 1,
    preparedAt: record.preparedAt ?? new Date().toISOString(),
  };
}

async function decryptRecord(code, record) {
  if (!record || record.version !== 1) return null;
  try {
    const salt = new Uint8Array(record.salt);
    const iv = new Uint8Array(record.iv);
    const key = await deriveKey(code, salt, record.assignmentId, record.workOrderId);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(record.ciphertext));
    return JSON.parse(decoder.decode(clear));
  } catch {
    return null;
  }
}

export async function savePreparedOfflineOrder(code, payload) {
  const assignmentId = payload?.assignmentId;
  const workOrderId = payload?.workOrder?.id;
  if (!assignmentId || !workOrderId) throw new Error('Offline order data is incomplete.');
  const database = await openDatabase();
  try {
    const encrypted = await encryptPayload(code, { assignmentId, workOrderId }, payload);
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(OBJECT_STORE);
    store.put(encrypted);
    await done;
    await globalThis.navigator?.storage?.persist?.().catch(() => false);
    return { assignmentId, workOrderId };
  } finally {
    database.close();
  }
}

export async function findPreparedOfflineOrder(code) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(OBJECT_STORE, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(transaction.objectStore(OBJECT_STORE).getAll());
    await done;
    for (const record of records) {
      const payload = await decryptRecord(code, record);
      if (payload) return { record, payload };
    }
    return null;
  } finally {
    database.close();
  }
}

export async function updatePreparedOfflineOrder(code, assignmentId, update) {
  const database = await openDatabase();
  try {
    const readTransaction = database.transaction(OBJECT_STORE, 'readonly');
    const readDone = transactionDone(readTransaction);
    const record = await requestResult(readTransaction.objectStore(OBJECT_STORE).get(assignmentId));
    await readDone;
    const payload = await decryptRecord(code, record);
    if (!payload) throw new Error('Prepared offline order could not be decrypted with this code.');
    const updatedPayload = await update(payload);
    const encrypted = await encryptPayload(code, record, updatedPayload);
    const writeTransaction = database.transaction(OBJECT_STORE, 'readwrite');
    const writeDone = transactionDone(writeTransaction);
    writeTransaction.objectStore(OBJECT_STORE).put(encrypted);
    await writeDone;
    return updatedPayload;
  } finally {
    database.close();
  }
}

export async function deletePreparedOfflineOrder(assignmentId) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(OBJECT_STORE).delete(assignmentId);
    await done;
  } finally {
    database.close();
  }
}
