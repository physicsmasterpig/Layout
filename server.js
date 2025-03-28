// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
const PORT = 3000;
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const keys = JSON.parse(fs.readFileSync('credential.json', 'utf8'));
const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key.replace(/\\n/g, '\n'), // Ensure the private key is correctly formatted
    ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
);
client.authorize((err) => {
    if (err) {
        console.error('Error connecting to Google Sheets API:', err);
        return;
    } else {
        console.log('Connected to Google Sheets API');
    }
});
const sheets = google.sheets({ version: 'v4', auth: client });
const spreadsheetId = "1NbcwKdFAwm0RRw5JIpaOMtCibWM_9gsUbYCOQ2GUNlI";
const sheetsRange = {   
            'student': 'student!A2:G', 
            'class': 'class!A2:G', 
            'lecture': 'lecture!A2:E', 
            'enrollment': 'enrollment!A2:D', 
            'attendance': 'attendance!A2:D', 
            'homework': 'homework!A2:E', 
            'exam': 'exam!A2:B', 
            'problem': 'problem!A2:C', 
            'exam_problem': 'exam_problem!A2:E',
            'score': 'score!A2:I'     
        }
// Route to serve specific menu content
app.get('/render/:page', (req, res) => {
    const { page } = req.params;
    const filePath = path.join(__dirname, 'public', 'menu-content', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('<p>Page not found.</p>');
        }
    });
});
// Load list
app.get('/load-list/:id', async (req, res) => {
    
    const { id } = req.params;
    range = sheetsRange[id];
    try {
        const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        res.json(result.data.values || []);
    } catch (err) {
        console.error(`Error loading ${ id } list:`, err);
        res.status(500).send(err);
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
