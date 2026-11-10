/** Shared setup-wizard types (kept out of the "use server" action file). */
export type SetupState = {
  needsSetup: boolean;
  hasAdmin: boolean;
  setupComplete: boolean;
  dbOk: boolean;
  userCount: number;
};
