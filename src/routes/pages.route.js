import { Router } from "express";

const router = Router();
const page = (view, title, extra = {}) => (req, res) => res.render(view, { title, ...extra });

/* Customer pages */
router.get("/", page("public/home", "BhajanKirtan"));
router.get("/search", page("public/performers", "Find Performers"));
router.get("/performers/:id", page("public/performer-detail", "Performer"));
router.get("/packages/:id", page("public/package-detail", "Package"));
router.get("/book", page("public/booking-form", "Request Booking"));
router.get("/booking-status", page("public/booking-status", "Booking Status"));
router.get("/contact", page("public/contact", "Contact Us"));

/* Admin pages: HTML only. All data comes from the JWT-protected /api/admin routes,
   so an admin page opened without logging in shows no data. */
router.use("/admin", (req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});
router.get("/admin/login", page("admin/login", "Admin Login"));
router.get("/admin", page("admin/dashboard", "Dashboard", { active: "dashboard" }));
router.get("/admin/bookings", page("admin/bookings", "Bookings", { active: "bookings" }));
router.get("/admin/performers", page("admin/performers", "Performers", { active: "performers" }));
router.get("/admin/performers/new", page("admin/performer-new", "Add Performer", { active: "performers" }));
router.get("/admin/performers/:id/edit", page("admin/performer-edit", "Edit Performer", { active: "performers" }));
router.get("/admin/packages", page("admin/packages", "Packages", { active: "packages" }));
router.get("/admin/pricing", page("admin/pricing", "Pricing", { active: "pricing" }));

export default router;