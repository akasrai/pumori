import { dropTestDb } from '../apps/api/scripts/testdb.ts';

/** Playwright global teardown: the e2e DB is throwaway, so drop it once the run ends. */
const teardown = async (): Promise<void> => {
  await dropTestDb('e');
};

export default teardown;
