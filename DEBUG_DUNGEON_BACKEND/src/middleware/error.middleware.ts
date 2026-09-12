import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "Malformed JSON request body" });
    return;
  }

  if (error?.type === "entity.too.large") {
    res.status(413).json({ message: "Request body is too large" });
    return;
  }

  res.status(500).json({ message: "Internal Server Error" });
};
