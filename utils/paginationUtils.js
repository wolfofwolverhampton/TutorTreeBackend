/**
 * Fetch paginated data from Firebase Realtime Database.
 * @param {string} path - Firebase DB path to query.
 * @param {number} pageSize - Number of items per page.
 * @param {string} [startAfterKey] - Key to start pagination after (cursor).
 * @param {string} [orderByKey] - The key or child property to order by (default is key).
 * @returns {Promise<{items: Array, nextKey: string|null}>}
 */
const admin = require("../config/firebase");
const db = admin.database();

const fetchPaginatedData = async (
  path,
  pageSize,
  startAfterKey = null,
  orderByKey = null
) => {
  let ref = db.ref(path);

  ref = orderByKey ? ref.orderByChild(orderByKey) : ref.orderByKey();

  if (startAfterKey) {
    ref = ref.startAfter(startAfterKey);
  }

  const snapshot = await ref.limitToFirst(pageSize + 1).once("value");

  if (!snapshot.exists()) {
    return { items: [], nextKey: null };
  }

  const allItems = [];
  snapshot.forEach((child) => {
    const item = child.val();
    item.id = child.key;
    allItems.push(item);
  });

  const items = allItems.slice(0, pageSize);
  const nextItem = allItems.length > pageSize ? allItems[pageSize] : null;

  const nextKey = nextItem ? nextItem.id : null;

  return { items, nextKey };
};

module.exports = { fetchPaginatedData };