const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

const categories = [
  { name: 'Jagrata', icon: '🔥' },
  { name: 'Mata Ki Chowki', icon: '🪔' },
  { name: 'Rudra Abhishek', icon: '🔱' },
  { name: 'Bhajan Sandhya', icon: '🎶' },
  { name: 'Kirtan', icon: '🪘' },
  { name: 'Satsang', icon: '🕉️' }
];

const performers = [
  { id: 1, name: 'Pt. Ramesh Sharma', speciality: 'Jagrata, Mata Ki Chowki', city: 'Bhubaneswar', experience: 15, price: 2000 },
  { id: 2, name: 'Anjali Devi Group', speciality: 'Bhajan Sandhya, Kirtan', city: 'Cuttack', experience: 10, price: 3500 },
  { id: 3, name: 'Acharya Vinod Mishra', speciality: 'Rudra Abhishek, Satsang', city: 'Puri', experience: 20, price: 5000 }
];

const packages = [
  { name: 'Basic', price: 'From ₹2,000', features: ['1 performer', '2 hours', 'Basic sound setup'] },
  { name: 'Premium', price: 'From ₹5,000', features: ['Performer + 2 musicians', '3 hours', 'Full sound system'], featured: true },
  { name: 'Pro', price: 'From ₹10,000', features: ['Full group', '4+ hours', 'Sound, lights and decoration'] }
];

app.get('/', (req, res) => {
  res.render('public/home', { title: 'BhajanKirtan', categories, performers, packages });
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));