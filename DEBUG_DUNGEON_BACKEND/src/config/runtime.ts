const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

export const isProduction = process.env.NODE_ENV === "production";

export const getFrontendOrigins = () => {
  const configuredOrigin = process.env.FRONTEND_ORIGIN?.trim();

  if (configuredOrigin) {
    return [configuredOrigin];
  }

  if (isProduction) {
    throw new Error("FRONTEND_ORIGIN is required in production");
  }

  return localOrigins;
};

export const getPort = () => {
  const configuredPort = Number(process.env.PORT ?? 8000);

  if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return configuredPort;
};

export const assertProductionConfiguration = () => {
  if (!isProduction) {
    return;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  getFrontendOrigins();
};
