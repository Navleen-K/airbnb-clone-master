const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const Guide = require('./models/Guide');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const mime = require('mime-types');

require('dotenv').config();

const app = express();

// Constants
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg';
const bucket = 'bookticket';

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
  credentials: true,
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
}));

// Helper Functions
async function uploadToS3(path, originalFilename, mimetype) {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const ext = originalFilename.split('.').pop();
  const newFilename = Date.now() + '.' + ext;

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Body: fs.readFileSync(path),
      Key: newFilename,
      ContentType: mimetype,
    }));
    return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload to S3');
  }
}

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, (err, userData) => {
      if (err) return reject(err);
      resolve(userData);
    });
  });
}

// Routes
app.get('/api/test', (req, res) => {
  res.json('test ok');
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(422).json({ error: 'All fields are required' });
  }
  
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    console.error('Registration error:', e);
    res.status(422).json({ error: e.message });
  }
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await User.findOne({ email });
    if (userDoc && bcrypt.compareSync(password, userDoc.password)) {
      const token = jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret);
      res.cookie('token', token, { httpOnly: true }).json(userDoc);
    } else {
      res.status(422).json('Invalid credentials');
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/profile', async (req, res) => {
  const { token } = req.cookies;
  if (token) {
    try {
      const userData = await getUserDataFromReq(req);
      const user = await User.findById(userData.id);
      res.json(user ? { name: user.name, email: user.email, _id: user._id } : null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json(null);
  }
});

app.post('/api/logout', (req, res) => {
  res.cookie('token', '', { httpOnly: true }).json(true);
});

app.post('/api/upload-by-link', async (req, res) => {
  const { link } = req.body;
  const newName = 'photo' + Date.now() + '.jpg';
  
  try {
    await imageDownloader.image({
      url: link,
      dest: '/tmp/' + newName,
    });

    const mimetype = mime.lookup('/tmp/' + newName);
    const url = await uploadToS3('/tmp/' + newName, newName, mimetype);

    // Clean up local file
    fs.unlinkSync('/tmp/' + newName);

    res.json({ url });
  } catch (e) {
    console.error('Error in /api/upload-by-link:', e);
    res.status(500).json({ error: e.message });
  }
});

const photosMiddleware = multer({ dest: '/tmp' });
app.post('/api/upload', photosMiddleware.array('photos', 100), async (req, res) => {
  try {
    const uploadedFiles = [];
    for (const file of req.files) {
      const { path, originalname, mimetype } = file;
      const url = await uploadToS3(path, originalname, mimetype);
      uploadedFiles.push(url);
    }
    res.json(uploadedFiles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/places', async (req, res) => {
  const { token } = req.cookies;
  const {
    title, address, addedPhotos, description, price,
    perks, extraInfo, checkIn, checkOut, maxGuests,
  } = req.body;
  try {
    const userData = await getUserDataFromReq(req);
    const placeDoc = await Place.create({
      owner: userData.id, price,
      title, address, photos: addedPhotos, description,
      perks, extraInfo, checkIn, checkOut, maxGuests,
    });
    res.json(placeDoc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user-places', async (req, res) => {
  const { token } = req.cookies;
  try {
    const userData = await getUserDataFromReq(req);
    const places = await Place.find({ owner: userData.id });
    res.json(places);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const place = await Place.findById(id);
    res.json(place);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/places', async (req, res) => {
  const { token } = req.cookies;
  const {
    id, title, address, addedPhotos, description,
    perks, extraInfo, checkIn, checkOut, maxGuests, price,
  } = req.body;
  try {
    const userData = await getUserDataFromReq(req);
    const placeDoc = await Place.findById(id);
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title, address, photos: addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price,
      });
      await placeDoc.save();
      res.json('ok');
    } else {
      res.status(403).json('Forbidden');
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const places = await Place.find();
    res.json(places);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;

  if (!userData) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!place || !checkIn || !checkOut || !numberOfGuests || !name || !phone || !price) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const booking = await Booking.create({
      place,
      checkIn,
      checkOut,
      numberOfGuests,
      name,
      phone,
      price,
      user: userData.id,
    });
    res.json(booking);
  } catch (e) {
    console.error('Error creating booking:', e); // Log the error for debugging
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  const userData = await getUserDataFromReq(req);
  try {
    const bookings = await Booking.find({ user: userData.id }).populate('place');
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Guide Registration and Profile Endpoints
const guideUpload = multer({ dest: 'uploads/' });

app.post('/api/register-guide', guideUpload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'profilePhoto', maxCount: 1 }]), async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { name, contact, email, languages, places } = req.body;
  const idProof = req.files.idProof ? req.files.idProof[0].path : null;
  const profilePhoto = req.files.profilePhoto ? req.files.profilePhoto[0].path : null;

  if (!userData) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name || !contact || !email || !languages || !places || !idProof || !profilePhoto) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const guide = await Guide.create({
      name,
      contact,
      email,
      languages: languages.split(',').map(lang => lang.trim()),
      places: places.split(',').map(place => place.trim()),
      idProof,
      profilePhoto,
      user: userData.id,
    });
    res.json(guide);
  } catch (e) {
    console.error('Error creating guide registration:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/guide-profile', async (req, res) => {
  const userData = await getUserDataFromReq(req);
  try {
    const guide = await Guide.findOne({ user: userData.id });
    if (!guide) {
      return res.status(404).json({ error: 'Guide profile not found' });
    }
    res.json(guide);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/update-guide', guideUpload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'profilePhoto', maxCount: 1 }]), async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { name, contact, email, languages, places } = req.body;
  const idProof = req.files.idProof ? req.files.idProof[0].path : null;
  const profilePhoto = req.files.profilePhoto ? req.files.profilePhoto[0].path : null;

  if (!userData) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name || !contact || !email || !languages || !places) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const guide = await Guide.findOne({ user: userData.id });
    if (!guide) {
      return res.status(404).json({ error: 'Guide profile not found' });
    }

    guide.name = name;
    guide.contact = contact;
    guide.email = email;
    guide.languages = languages.split(',').map(lang => lang.trim());
    guide.places = places.split(',').map(place => place.trim());
    if (idProof) guide.idProof = idProof;
    if (profilePhoto) guide.profilePhoto = profilePhoto;

    await guide.save();
    res.json(guide);
  } catch (e) {
    console.error('Error updating guide profile:', e);
    res.status(500).json({ error: e.message });
  }
});


// Start Server
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});

