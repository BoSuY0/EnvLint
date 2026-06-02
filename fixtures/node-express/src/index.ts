const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const dynamicFlag = process.env[`FEATURE_${process.env.NODE_ENV}`];

export { databaseUrl, dynamicFlag, jwtSecret };

