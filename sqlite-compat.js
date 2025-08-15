import * as SQLite from 'expo-sqlite';
export function openDatabase(name) {
  let _db;
  let _ready = SQLite.openDatabaseAsync(name).then(db => (_db = db));
  return {
    transaction(cb) {
      const tx = {
        executeSql: async (sql, params = [], onSuccess, onError) => {
          try {
            await _ready;
            const res = await _db.runAsync(sql, params);
            const rows = res?.rows ?? [];
            const resultSet = { rows: { _array: Array.isArray(rows) ? rows : [] } };
            onSuccess && onSuccess(this, resultSet);
          } catch (e) {
            onError && onError(this, e);
          }
        },
      };
      cb(tx);
    },
  };
}
export default { openDatabase };
