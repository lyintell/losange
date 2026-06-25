const webDbStub = {
  execAsync: async () => {},
  runAsync: async () => ({ changes: 0 }),
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  withTransactionAsync: async (work) => work(),
};

export const getLocalDB = async () => webDbStub;

export const initLocalDatabase = async () => {};

export const ensureLocalDatabaseReady = async () => webDbStub;

export const runWithLocalDatabase = async (work) => work(webDbStub);

export const tableHasColumn = async () => false;
