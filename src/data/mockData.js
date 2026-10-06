const iso = (d = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

const categories = [
  { name: 'Jagrata', icon: '🔥' },
  { name: 'Mata Ki Chowki', icon: '🪔' },
  { name: 'Rudra Abhishek', icon: '🔱' },
  { name: 'Bhajan Sandhya', icon: '🎶' },
  { name: 'Kirtan', icon: '🪘' },
  { name: 'Satsang', icon: '🕉️' }
];

const performers = [
  { id: 1, name: 'Pt. Ramesh Sharma', events: ['Jagrata', 'Mata Ki Chowki'], speciality: 'Jagrata, Mata Ki Chowki', city: 'Bhubaneswar', experience: 15, price: 2000, active: true, bio: 'Renowned jagrata singer with 15 years of experience performing at homes, temples and community events.' },
  { id: 2, name: 'Anjali Devi Group', events: ['Bhajan Sandhya', 'Kirtan'], speciality: 'Bhajan Sandhya, Kirtan', city: 'Cuttack', experience: 10, price: 3500, active: true, bio: 'A five-member group known for soulful bhajan evenings and kirtan.' },
  { id: 3, name: 'Acharya Vinod Mishra', events: ['Rudra Abhishek', 'Satsang'], speciality: 'Rudra Abhishek, Satsang', city: 'Puri', experience: 20, price: 5000, active: true, bio: 'Vedic scholar conducting Rudra Abhishek and satsang with proper rituals.' },
  { id: 4, name: 'Shree Mata Mandali', events: ['Mata Ki Chowki', 'Jagrata'], speciality: 'Mata Ki Chowki, Jagrata', city: 'Bhubaneswar', experience: 8, price: 2500, active: false, bio: 'Energetic mandali for chowki and all-night jagrata.' }
];

const packages = [
  { name: 'Basic', price: 'From ₹2,000', features: ['1 performer', '2 hours', 'Basic sound setup'] },
  { name: 'Premium', price: 'From ₹5,000', features: ['Performer + 2 musicians', '3 hours', 'Full sound system'], featured: true },
  { name: 'Pro', price: 'From ₹10,000', features: ['Full group', '4+ hours', 'Sound, lights and decoration'] }
];

const peakPrices = [
  { id: 1, label: 'Navratri Season', from: '2026-10-01', to: '2026-10-10', price: 10000 },
  { id: 2, label: 'Shravan Month', from: '2026-08-01', to: '2026-08-31', price: 6000 }
];

const bookings = [
  { id: 1, ref: 'BK1001', customer: 'Sunita Das', phone: '98765 43210', email: 'sunita@example.com', event: 'Jagrata', performer: 'Pt. Ramesh Sharma', date: iso(0), time: '7:00 PM', location: 'Saheed Nagar, Bhubaneswar', guests: 150, status: 'Confirmed', reconfirmed: true },
  { id: 2, ref: 'BK1002', customer: 'Rakesh Panda', phone: '91234 56780', email: 'rakesh@example.com', event: 'Bhajan Sandhya', performer: 'Anjali Devi Group', date: iso(0), time: '6:00 PM', location: 'Cuttack', guests: 80, status: 'Confirmed', reconfirmed: false },
  { id: 3, ref: 'BK1003', customer: 'Meera Nayak', phone: '99887 76655', email: 'meera@example.com', event: 'Rudra Abhishek', performer: 'Acharya Vinod Mishra', date: iso(1), time: '9:00 AM', location: 'Puri', guests: 40, status: 'Confirmed', reconfirmed: false },
  { id: 4, ref: 'BK1004', customer: 'Amit Sahu', phone: '97000 11122', email: 'amit@example.com', event: 'Mata Ki Chowki', performer: 'Pt. Ramesh Sharma', date: iso(1), time: '8:00 PM', location: 'Patia, Bhubaneswar', guests: 100, status: 'Confirmed', reconfirmed: true },
  { id: 5, ref: 'BK1005', customer: 'Priya Mohanty', phone: '98111 22233', email: 'priya@example.com', event: 'Kirtan', performer: 'Not allotted', date: iso(7), time: '5:00 PM', location: 'Khurda', guests: 60, status: 'Requested', reconfirmed: false },
  { id: 6, ref: 'BK1006', customer: 'Dilip Behera', phone: '90909 80808', email: 'dilip@example.com', event: 'Jagrata', performer: 'Not allotted', date: iso(12), time: '9:00 PM', location: 'Balasore', guests: 200, status: 'Requested', reconfirmed: false }
];

const getPrice = (performer, date) => {
  const peak = peakPrices.find(p => date >= p.from && date <= p.to);
  return peak ? { amount: peak.price, peak: true, label: peak.label } : { amount: performer.price, peak: false };
};

module.exports = { iso, categories, performers, packages, peakPrices, bookings, getPrice };