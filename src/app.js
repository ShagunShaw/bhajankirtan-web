const express = require('express');
const path = require('path');
const { iso, categories, performers, packages, peakPrices, bookings, getPrice } = require('./data/mockData');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

/* ---------- Public ---------- */
app.get('/', (req, res) => {
  res.render('public/home', { title: 'BhajanKirtan', categories, performers: performers.filter(p => p.active), packages });
});

app.get('/performers', (req, res) => {
  const { event = '', city = '', maxPrice = '', date = '' } = req.query;
  let list = performers.filter(p => p.active);
  if (event) list = list.filter(p => p.events.includes(event));
  if (city) list = list.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));
  if (maxPrice) list = list.filter(p => p.price <= Number(maxPrice));
  res.render('public/performers', { title: 'Find Performers', categories, performers: list, q: { event, city, maxPrice, date } });
});

app.get('/performers/:id', (req, res) => {
  const performer = performers.find(p => p.id === Number(req.params.id));
  if (!performer) return res.status(404).send('Performer not found');
  res.render('public/performer-detail', { title: performer.name, performer, peakPrices });
});

app.get('/book/:id', (req, res) => {
  const performer = performers.find(p => p.id === Number(req.params.id));
  if (!performer) return res.status(404).send('Performer not found');
  res.render('public/booking-form', { title: 'Request Booking', performer, packages });
});

app.post('/book', (req, res) => {
  console.log('Booking request (demo):', req.body);
  res.redirect('/booking/BK1005?new=1');
});

app.get('/booking/:ref', (req, res) => {
  const booking = bookings.find(b => b.ref === req.params.ref);
  if (!booking) return res.status(404).send('Booking not found');
  res.render('public/booking-status', { title: 'Booking Status', booking, isNew: req.query.new === '1' });
});

app.get('/contact', (req, res) => res.render('public/contact', { title: 'Contact Us', sent: false }));
app.post('/contact', (req, res) => res.render('public/contact', { title: 'Contact Us', sent: true }));

/* ---------- Admin (no login check yet, added with the backend) ---------- */
app.get('/admin/login', (req, res) => res.render('admin/login', { title: 'Admin Login' }));
app.post('/admin/login', (req, res) => res.redirect('/admin'));

app.get('/admin', (req, res) => {
  const today = bookings.filter(b => b.date === iso(0) && b.status === 'Confirmed');
  const tomorrow = bookings.filter(b => b.date === iso(1) && b.status === 'Confirmed');
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Requested').length,
    upcoming: bookings.filter(b => b.date >= iso(0) && b.status === 'Confirmed').length
  };
  res.render('admin/dashboard', { title: 'Dashboard', active: 'dashboard', today, tomorrow, stats });
});

app.get('/admin/performers', (req, res) => res.render('admin/performers', { title: 'Performers', active: 'performers', performers, categories }));
app.get('/admin/bookings', (req, res) => res.render('admin/bookings', { title: 'Bookings', active: 'bookings', bookings, performers }));
app.get('/admin/packages', (req, res) => res.render('admin/packages', { title: 'Packages', active: 'packages', packages }));
app.get('/admin/pricing', (req, res) => res.render('admin/pricing', { title: 'Pricing', active: 'pricing', performers, peakPrices }));

app.listen(3000, () => console.log('Running on http://localhost:3000'));