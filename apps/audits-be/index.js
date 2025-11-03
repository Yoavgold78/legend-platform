import express from 'express';
import mongoose from 'mongoose';
// dotenv.config() is no longer needed here, it will be handled by the start script.
import cors from 'cors';

// Import all routes using the modern ES Module syntax
import authRoutes from './routes/auth.js';
import auditsRoutes from './routes/audits.js';
import storesRoutes from './routes/stores.js';
import templatesRoutes from './routes/templates.js';
import inspectionsRoutes from './routes/inspections.js';
import uploadRoutes from './routes/upload.js';
import tasksRoutes from './routes/tasks.js';
import checklistsRoutes from './routes/checklists.js';
import checklistInstancesRoutes from './routes/checklistInstances.js';
import notificationRoutes from './routes/notifications.js'; // --- הוספנו את השורה הזו ---

// Debug: Check if CLOUDINARY_URL is loaded
console.log('[server] CLOUDINARY_URL loaded:', !!process.env.CLOUDINARY_URL);
if (process.env.CLOUDINARY_URL) {
  console.log('[server] CLOUDINARY_URL format check:', process.env.CLOUDINARY_URL.startsWith('cloudinary://'));
}

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.1.48:3000',
  'http://192.168.208.239:3000',
  'https://auditsapp.onrender.com'
];

if (process.env.FRONTEND_BASE_URL) {
  allowedOrigins.push(process.env.FRONTEND_BASE_URL);
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-auth-token'
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


console.log("Attempting to connect to MongoDB...");
if (!process.env.MONGO_URI) {
    console.error("--- !!! CRITICAL ERROR !!! ---");
    console.error("MONGO_URI environment variable is not set. The server cannot start.");
    console.error("Please add MONGO_URI to your environment variables in the Render dashboard.");
} else {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("✅ MongoDB connected successfully! The server should now start listening for requests.");
        })
        .catch(err => {
            console.error("--- !!! CRITICAL: MONGODB CONNECTION FAILED !!! ---");
            console.error("This is the most common cause for deployment failure.");
            console.error("Please check the following:");
            console.error("1. Is your MONGO_URI in Render's Environment Variables copied correctly from MongoDB Atlas?");
            console.error("2. Did you replace `<password>` with your actual database password?");
            console.error("3. Is the IP Access List in MongoDB Atlas set to 'Allow Access From Anywhere' (0.0.0.0/0)?");
            console.error("\n--- Full Error Details ---");
            console.error(err);
            console.error("--------------------------");
        });
}

// Use the imported routes
app.use('/api/auth', authRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/checklist-instances', checklistInstancesRoutes);
app.use('/api/notifications', notificationRoutes); // --- שורה זו תעבוד עכשיו ---


app.get('/api/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => console.log(`Server started on ${HOST}:${PORT}`));