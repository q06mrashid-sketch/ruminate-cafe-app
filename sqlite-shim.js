export const openDatabase = () => ({
  transaction: (cb) => cb({ executeSql: () => {} }),
});
export default { openDatabase };
