import { Router } from "express";

const router = Router();
const page = (view, title, extra = {}) => (req, res) => res.render(view, { title, ...extra });

const WEB_ROUTE = process.env.NODE_ENV === 'production' ? process.env.WEB_ROUTE : `http://localhost:${process.env.PORT}/api/`

/* Customer pages */
router.get("/", async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    // Fetch both APIs in parallel
    const [performerRes, packageRes] = await Promise.all([
      fetch(`${base}/default/`),
      fetch(`${base}/default/packages`)
    ]);

    if (!performerRes.ok || !packageRes.ok) {
      throw new Error("Failed to fetch homepage data");
    }

    const [performerResult, packageResult] = await Promise.all([
      performerRes.json(),
      packageRes.json()
    ]);

    if (!performerResult.success || !packageResult.success) {
      throw new Error("API returned an unsuccessful response");
    }

    const performers = performerResult.data.performers || [];
    const tags = performerResult.data.tags || [];
    const packages = packageResult.data || [];

    res.render("public/home", {
      title: "BhajanKirtan | Book Devotional Artists",
      performers,
      tags,
      packages
    });
  } catch (err) {
    next(err);
  }
});
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