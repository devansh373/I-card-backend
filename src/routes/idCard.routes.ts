// // src/routes/idCard.routes.ts
// import { Router } from "express";
// import { previewIdCard } from "../controllers/idCard.controller.js";

// const router = Router();

// router.get("/students/:studentId/id-card/preview", previewIdCard);

// export default router;

import { Router } from "express";
import {
  bulkGenerateIdCards,
  getIdCardPreviews,
  previewIdCard,
  printIdCards,
} from "../controllers/idCard.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

router.get(
  "/students/:studentId/id-card/single-generate",
  authenticate,
  authorizeRoles("SUPER_ADMIN", "SCHOOL_ADMIN", "VENDOR", "TEACHER"),
  previewIdCard
);
router.post(
  "/id-cards/bulk-generate",
  authenticate,
  authorizeRoles("SUPER_ADMIN", "SCHOOL_ADMIN", "VENDOR", "TEACHER"),
  bulkGenerateIdCards
);
router.post(
  "/id-cards/print",
  authenticate,
  authorizeRoles("SUPER_ADMIN", "SCHOOL_ADMIN", "VENDOR", "TEACHER"),
  printIdCards
);
router.get(
  "/id-cards/previews",
  authenticate,
  authorizeRoles("SUPER_ADMIN", "SCHOOL_ADMIN", "VENDOR", "TEACHER"),
  getIdCardPreviews
);

export default router;
