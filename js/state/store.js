// Shared application state. Views read it; only the service and view code that owns a value writes it.
export const state = {
  me: null,                          // signed-in profile with stats, or null before joining
  settings: { reviewsRequired: 1 }, // read from the database at startup
  bootError: null,                   // set if the connection failed at startup
};
