import express, { Request, Response } from "express";
import path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.GOOGLE_PROJECT_ID;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

const app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs'); // Add this line to specify the view engine

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const TARGET_LATITUDE = -6.327211640630863;
const TARGET_LONGITUDE = 106.79588365525132;
const MAX_DISTANCE_METERS = 100;

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radius of Earth in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

app.get("/", (req: Request, res: Response) => {
    res.render('index'); // Make sure you have an 'index.ejs' file in the views folder
});

app.get("/tk", (req: Request, res: Response) => {
    res.render('tk-form'); // Make sure you have an 'index.ejs' file in the views folder
});

// Separate the handler function to avoid async issues in Express's `post` method
const handlePostRequest = async (req: Request, res: Response): Promise<void> => {
    const { name, email, class_type, partner, latitude, longitude } = req.body;

    // Check if location is within 100 meters
    if (latitude && longitude) {
        const distance = getDistanceFromLatLonInMeters(
            TARGET_LATITUDE, TARGET_LONGITUDE, parseFloat(latitude), parseFloat(longitude)
        );

        if (distance > MAX_DISTANCE_METERS) {
            res.status(400).send("Submission failed: outside 100-meter radius.");
            return; // End the function early after sending the response
        }
    } else {
        res.status(400).send("Submission failed: location data is missing.");
        return; // End the function early after sending the response
    }

    // Get current date and time in UTC
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 7); // Convert to Jakarta time (UTC+7)

    const date = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const time = currentDate.toISOString().split('T')[1].split('.')[0]; // Format: HH:mm:ss

    // Google Sheets authentication
    const auth = new google.auth.GoogleAuth({
        credentials: {
            project_id: projectId,
            private_key: privateKey,
            client_email: clientEmail
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({
        version: 'v4',
        auth: client as OAuth2Client, // Cast to ensure the correct type
    });
    const spreadsheetId = '1mIfVTFWx-G6lzR8lB8TnY2NzZtC7diNqWlS-atNw37k';

    // Append data to the Google Sheets
    await googleSheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [
                [date, time, name, email, class_type, partner],
            ],
        },
    });

    res.send("Form submitted successfully"); // Send success response
};

const handlePostRequest_tk = async (req: Request, res: Response): Promise<void> => {
    const { name, piket, note, latitude, longitude } = req.body;

    // Check if location is within 100 meters
    if (latitude && longitude) {
        const distance = getDistanceFromLatLonInMeters(
            TARGET_LATITUDE, TARGET_LONGITUDE, parseFloat(latitude), parseFloat(longitude)
        );

        if (distance > MAX_DISTANCE_METERS) {
            res.status(400).send("Submission failed: outside 100-meter radius.");
            return; // End the function early after sending the response
        }
    } else {
        res.status(400).send("Submission failed: location data is missing.");
        return; // End the function early after sending the response
    }

    // Get current date and time in UTC
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 7); // Convert to Jakarta time (UTC+7)

    const date = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const time = currentDate.toISOString().split('T')[1].split('.')[0]; // Format: HH:mm:ss

    // Determine check-in or check-out based on the time
    const hour = currentDate.getHours();
    const checkinout = hour < 9 ? "checkin" : "checkout";

    // Google Sheets authentication
    const auth = new google.auth.GoogleAuth({
        credentials: {
            project_id: projectId,
            private_key: privateKey,
            client_email: clientEmail
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({
        version: 'v4',
        auth: client as OAuth2Client, // Cast to ensure the correct type
    });
    const spreadsheetId = '1nznkNByOAtJvTI_si_Ft0GAiEuYeyemaR6gRkJbIrSU';

    // Prepare the data to append to the Google Sheets
    const piketValue = piket === 'Yes' ? 'Piket' : 'Tidak Piket'; // Convert piket to numeric value

    // Append data to the Google Sheets
    await googleSheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [
                [date, time, name, piketValue, checkinout, note],
            ],
        },
    });

    res.send("Form submitted successfully"); // Send success response
};


// Now pass the handler to app.post
app.post('/', handlePostRequest);

app.post('/tk', handlePostRequest_tk);

app.listen(3001, () => console.log("Server ready on port 3001."));

export default app;
