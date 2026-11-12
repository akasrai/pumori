import { dropTestDb, prepareTestDb } from '../scripts/testdb.ts';

// Runs once per `vitest run`: gives this checkout a fresh, migrated database.
// Vitest's globalSetup picks up the named `setup` export.
export const setup = async (): Promise<void> => {
  await prepareTestDb('t');
};

// The DB is throwaway: drop it when the run ends so test DBs never pile up.
export const teardown = async (): Promise<void> => {
  await dropTestDb('t');
};
