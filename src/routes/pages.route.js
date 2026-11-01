import { Router } from "express";

const router = Router();
const page = (view, title, extra = {}) => (req, res) => res.render(view, { title, ...extra });

const WEB_ROUTE = process.env.NODE_ENV === 'production' ? process.env.WEB_ROUTE : `http://localhost:${process.env.PORT}/api/`

const requireAdmin = async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    // Set this to an existing GET endpoint protected by verifyJWT.
    const checkPath = process.env.ADMIN_AUTH_CHECK_PATH;

    if (!checkPath) {
      return res.status(500).send("Admin authentication endpoint is not configured.");
    }

    const response = await fetch(`${base}${checkPath}`, {
      method: "GET",
      headers: {
        Cookie: req.headers.cookie || "",
      },
    });

    // Preserve refreshed cookies if the backend renews the access token.
    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
      res.append("Set-Cookie", cookie);
    }

    if (response.status === 401 || response.status === 403) {
      return res.redirect("/admin/login");
    }

    if (!response.ok) {
      return res.status(502).send("Unable to verify admin session.");
    }

    next();
  } catch (error) {
    console.error("Admin authentication check failed:", error.message);
    return res.status(502).send("Unable to verify admin session.");
  }
};

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
router.get("/search", page("public/performers", "Find Performers"));      // This route is not JWT protected
router.get("/performers/:id", async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(
      `${base}/default/performer/${req.params.id}`
    );

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch performer");
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return res.status(404).send("Performer not found");
    }

    res.render("public/performer-detail", {
      title: `${result.data.fullName} | BhajanKirtan`,
      performer: result.data,
    });
  } catch (err) {
    next(err);
  }
});
router.get("/packages/:id", async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(
      `${base}/default/package/${req.params.id}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).send("Package not found");
      }

      throw new Error("Failed to fetch package details");
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return res.status(404).send("Package not found");
    }

    res.render("public/package-detail", {
      title: `${result.data.packageName} | BhajanKirtan`,
      pkg: result.data,
    });
  } catch (err) {
    next(err);
  }
});
router.get("/book/performer/:id", (req, res) => {
  res.render("public/booking-performer", {
    title: "Book Performer | BhajanKirtan",
    performerId: req.params.id,
  });
});

// Submit the booking request.
router.post("/book/performer/:id", async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(
      `${base}/default/book/performer/${encodeURIComponent(req.params.id)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const result = await response.json();

    // Return the backend response to the frontend, including errors.
    res.status(response.status).json(result);
  } catch (err) {
    next(err);
  }
});
router.get("/book/package/:id", (req, res) => {
  res.render("public/booking-package", {
    title: "Book Package | BhajanKirtan",
    packageId: req.params.id,
  });
});

// Submit package booking
router.post("/book/package/:id", async (req, res, next) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(
      `${base}/book/package/${encodeURIComponent(req.params.id)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    next(err);
  }
});
router.get("/booking-status", (req, res) => {
  res.render("public/booking-status", {
    title: "Booking Status | BhajanKirtan",
  });
});

router.post("/booking-status/check", async (req, res) => {
  try {
    const { refId, phone } = req.body || {};

    if (
      typeof refId !== "string" || !refId.trim() ||
      typeof phone !== "string" || !phone.trim()
    ) {
      return res.status(400).json({
        success: false,
        errName: "Validation Error",
        errMessage: "Reference ID and phone number are required.",
      });
    }

    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(`${base}/default/booking/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refId: refId.trim(),
        phone: phone.trim(),
      }),
    });

    const result = await response.json();
    return res.status(response.status).json(result);

  } catch (error) {
    console.error("Booking status lookup failed:", error.message);

    return res.status(500).json({
      success: false,
      errName: "Internal Server Error",
      errMessage: "Something went wrong while checking your booking. Please try again later.",
    });
  }
});
router.get("/contact", page("public/contact", "Contact Us"));     // This route is not JWT protected

/* Admin pages: HTML only. All data comes from the JWT-protected /api/admin routes,
   so an admin page opened without logging in shows no data. */
router.use("/admin", (req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});


router.get("/admin/login", (req, res) => {
  res.render("public/admin-login", {
    title: "Admin Login | BhajanKirtan",
  });
});

router.post("/admin/login", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (
      (!username && !email) ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        errName: "Validation Error",
        errMessage: "Username or email and password are required.",
      });
    }

    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(`${base}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username || "",
        email: email || "",
        password,
      }),
    });

    // Forward authentication cookies, if the backend sets any.
    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
      res.append("Set-Cookie", cookie);
    }

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error("Admin login failed:", error.message);

    return res.status(500).json({
      success: false,
      errName: "Internal Server Error",
      errMessage: "Unable to log in right now. Please try again later.",
    });
  }
});

router.use("/admin", requireAdmin);

router.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard");
});

router.get(
  "/admin/dashboard",
  page("admin/dashboard", "Dashboard | BhajanKirtan", {
    active: "dashboard",
  })
);

router.get("/admin/dashboard/data", async (req, res) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(`${base}/admin/dashboard`, {
      method: "GET",
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/json",
      },
    });

    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
      res.append("Set-Cookie", cookie);
    }

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error("Dashboard data fetch failed:", error.message);

    return res.status(502).json({
      success: false,
      message: "Unable to load dashboard data.",
    });
  }
});

// Forward admin actions to the backend API.
// WEB_ROUTE already includes /api in your current configuration.
const forwardAdminApi = async (req, res, backendPath) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");

    const response = await fetch(`${base}${backendPath}`, {
      method: req.method,
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/json",
        ...(req.method !== "GET" && req.method !== "HEAD"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(req.method !== "GET" && req.method !== "HEAD"
        ? { body: JSON.stringify(req.body || {}) }
        : {}),
    });

    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
      res.append("Set-Cookie", cookie);
    }

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error("Admin API forwarding failed:", error.message);

    return res.status(502).json({
      success: false,
      errMessage: "Unable to connect to the server. Please try again.",
    });
  }
};

// Fetch performers for confirmation and reallotment.
router.get("/admin/actions/performers", (req, res) =>
  forwardAdminApi(req, res, "/performer/")
);

// Confirm booking.
router.post("/admin/actions/confirm/:bookingId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/booking/confirm/${encodeURIComponent(req.params.bookingId)}`
  )
);

// Reject booking.
router.post("/admin/actions/reject/:bookingId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/booking/reject/${encodeURIComponent(req.params.bookingId)}`
  )
);

// Cancel booking.
router.post("/admin/actions/cancel/:bookingId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/booking/cancel/${encodeURIComponent(req.params.bookingId)}`
  )
);

// Reallot performer.
router.post("/admin/actions/reallot/:bookingId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/booking/reallot/${encodeURIComponent(req.params.bookingId)}`
  )
);

router.get("/admin/bookings", page("admin/bookings", "Bookings", { active: "bookings" }));

// Initial bookings list
router.get("/admin/bookings/data", async (req, res) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");
    const query = new URLSearchParams(req.query).toString();

    const response = await fetch(`${base}/booking/?${query}`, {
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/json",
      },
    });

    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) res.append("Set-Cookie", cookie);

    return res.status(response.status).json(await response.json());
  } catch (error) {
    console.error("Bookings fetch failed:", error.message);
    return res.status(502).json({
      success: false,
      errMessage: "Unable to load bookings. Please try again.",
    });
  }
});

// Filtered bookings search
router.get("/admin/bookings/search", async (req, res) => {
  try {
    const base = WEB_ROUTE.replace(/\/+$/, "");
    const query = new URLSearchParams(req.query).toString();

    const response = await fetch(`${base}/booking/search?${query}`, {
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/json",
      },
    });

    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) res.append("Set-Cookie", cookie);

    return res.status(response.status).json(await response.json());
  } catch (error) {
    console.error("Booking search failed:", error.message);
    return res.status(502).json({
      success: false,
      errMessage: "Unable to search bookings. Please try again.",
    });
  }
});

// Performer detail page (HTML only)
router.get("/admin/performer/:performerId", (req, res) =>
  res.render("admin/performer-detail", {
    title: "Performer | BhajanKirtan",
    active: "performers",
    performerId: req.params.performerId,
  })
);

// Single performer data -> GET WEB_ROUTE/performer/:performerId
router.get("/admin/actions/performer/:performerId", (req, res) =>
  forwardAdminApi(req, res, `/performer/${encodeURIComponent(req.params.performerId)}`)
);

// Visibility toggle -> PATCH WEB_ROUTE/performer/visibility/:performerId
router.patch("/admin/actions/performer/visibility/:performerId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/performer/visibility/${encodeURIComponent(req.params.performerId)}`
  )
);

// ---- Package data (forwarded to backend with the admin cookie) ----
// All packages -> GET WEB_ROUTE/package/
router.get("/admin/actions/packages", (req, res) =>
  forwardAdminApi(req, res, "/package/")
);

// Single package -> GET WEB_ROUTE/package/:packageId
router.get("/admin/actions/package/:packageId", (req, res) =>
  forwardAdminApi(req, res, `/package/${encodeURIComponent(req.params.packageId)}`)
);

// Visibility toggle -> PATCH WEB_ROUTE/package/visibility/:packageId
router.patch("/admin/actions/package/visibility/:packageId", (req, res) =>
  forwardAdminApi(
    req,
    res,
    `/package/visibility/${encodeURIComponent(req.params.packageId)}`
  )
);

router.get("/admin/performers", page("admin/performers", "Performers", { active: "performers" }));
router.get("/admin/performers/new", page("admin/performer-new", "Add Performer", { active: "performers" }));
router.get("/admin/performers/:id/edit", page("admin/performer-edit", "Edit Performer", { active: "performers" }));
// ---- Package pages (HTML only) ----
router.get("/admin/packages", (req, res) => res.redirect("/admin/package")); // keeps old links working

router.get(
  "/admin/package",
  page("admin/packages", "Packages | BhajanKirtan", { active: "packages" })
);

router.get("/admin/package/:packageId", (req, res) =>
  res.render("admin/package-detail", {
    title: "Package | BhajanKirtan",
    active: "packages",
    packageId: req.params.packageId,
  })
);
router.get("/admin/pricing", page("admin/pricing", "Pricing", { active: "pricing" }));

export default router;