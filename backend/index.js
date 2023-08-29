const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3006;

app.use(cors(
  {
        origin: ["https://codebrew-rho.vercel.app"],
        methods: ["POST", "GET"],
        credentials: true
  }
));

const validCredentials = {
  admin: {
    username: 'admin',
    password: 'password123',
    isAdmin: true,
  },
  user: {
    username: 'user',
    password: 'password456',
    isAdmin: false,
  },
};

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://codebrew:VHl6ZfONFtVmXJAU@cluster0.ptfzz1t.mongodb.net/codebrew';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});


// Mongoose schema and model
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', UserSchema);

app.use(bodyParser.json());
app.use(cors());

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

app.use((req, _, next) => {
  log(`Incoming HTTP Request - ${req.method} ${req.url}`);
  next();
});

app.use((err, req, res, next) => {
  log(`Error occurred during ${req.method} request for ${req.url}: ${err.stack}`);
  res.status(500).send('Something broke!');
});

app.post('/customer/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name,
      email: email,
      password: hashedPassword,
    });

    try {
      const savedUser = await newUser.save();
      console.log(`[User Added] ${new Date().toISOString()} - Data:`, savedUser);
      res.json({ status: 'Success', data: savedUser });
    } catch (error) {
      console.error('Error adding new user:', error);
      res.status(500).json({ status: 'Failed', error: 'Error adding new user' });
    }
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ status: 'Failed', error: 'Error hashing password' });
  }
});

app.post('/customer/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === validCredentials.admin.email && password === validCredentials.admin.password) {
    console.log('[Admin Login] Successful');
    res.json({ status: 'Success', token: 'your-jwt-token', isAdmin: true });
    return;
  }

  try {
    const user = await User.findOne({ email: email });
    
    if (!user) {
      res.status(401).json({ status: 'Failed', error: 'User not found' });
    } else {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        res.status(401).json({ status: 'Failed', error: 'Incorrect password' });
      } else {
        res.json({ status: 'Success', token: 'your-jwt-token', isAdmin: user.isAdmin });
      }
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ status: 'Failed', error: 'Error checking user' });
  }
});


// Define the Staff schema
const staffSchema = new mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: String,
  address: String,
});

// Create the Staff model
const Staff = mongoose.model('Staff', staffSchema);

app.use(bodyParser.json());

app.get('/staff', async (req, res) => {
  try {
    const staffMembers = await Staff.find();
    res.json(staffMembers);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Error fetching staff data' });
  }
});

app.post('/staff', async (req, res) => {
  const newStaff = req.body;
  try {
    const staffMember = new Staff(newStaff);
    await staffMember.save();
    console.log(`[Staff Added] ${new Date().toISOString()} - Data:`, staffMember);
    res.json({ status: 'Success', data: staffMember });
  } catch (error) {
    console.error('Error adding new staff:', error);
    res.status(500).json({ error: 'Error adding new staff' });
  }
});

app.put('/staff/:id', async (req, res) => {
  const { id } = req.params;
  const updatedStaff = req.body;
  try {
    const updatedStaffMember = await Staff.findByIdAndUpdate(id, updatedStaff, { new: true });
    console.log(`[Staff Updated] ${new Date().toISOString()} - Data:`, updatedStaffMember);
    res.json({ status: 'Updated', data: updatedStaffMember });
  } catch (error) {
    console.error(`[Database Error] ${new Date().toISOString()} - Error updating staff ID: ${id}:`, error);
    res.status(500).json({ error: 'Error updating staff' });
  }
});

app.delete('/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const staffDetails = await Staff.findByIdAndDelete(id);
    if (staffDetails) {
      console.log(`[Staff Deleted] ${new Date().toISOString()} - Data:`, staffDetails);
      res.json({ status: 'Deleted' });
    } else {
      res.status(404).json({ error: 'Staff not found' });
    }
  } catch (error) {
    console.error(`[Database Error] ${new Date().toISOString()} - Deleting staff ID: ${id}`, error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});


app.get('/', (_, res) => {
  log('Root endpoint accessed');
  res.send('Hello, Express!');
});

app.listen(port, () => {
  log(`Server Running on http://localhost:${port}`);
});
