const webDbStub = {
  execAsync: async () => {},
  runAsync: async () => ({ changes: 0 }),
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
};

export const getLocalDB = async () => webDbStub;

export const initLocalDatabase = async () => {};

export const ensureLocalDatabaseReady = async () => webDbStub;
