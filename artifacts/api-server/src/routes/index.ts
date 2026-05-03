import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import authRouter from "./auth";
import settingsRouter from "./settings";
import allergensRouter from "./allergens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(settingsRouter);
router.use(allergensRouter);

export default router;
