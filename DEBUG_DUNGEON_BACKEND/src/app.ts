import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import missionRouter from "./routes/mission.routes.js";
import userRouter from "./routes/user.routes.js";
import missionGenerationRouter from "./routes/mission-generation.routes.js";
import { getFrontendOrigins } from "./config/runtime.js";

const app = express();

const frontendOrigins = getFrontendOrigins();

app.use(
	cors({
		origin: (origin, callback) => {
			callback(null, !origin || frontendOrigins.includes(origin));
		},
	}),
);
app.use(express.json({ limit: "1mb" }));
app.use("/auth", authRoutes);
app.use("/", healthRoutes);
app.use("/missions", missionGenerationRouter);
app.use("/missions", missionRouter);
app.use("/users", userRouter);
app.use(errorHandler);
export default app;
