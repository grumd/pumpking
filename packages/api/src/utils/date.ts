export const prepareForKnexUtc = (date: Date): Date => {
  // Knex ignores the timezone when recording dates into the DB
  // If your local time is 21:00 +03:00, Knex will record 21:00
  // We store UTC dates in the database, so this code will convert your
  // 21:00 +03:00 to 18:00 +03:00
  // So that Knex records 18:00 into the DB

  return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
};
