import {google} from 'googleapis';
import {spreadsheetId} from '../config';


const auth = new google.auth.GoogleAuth({
    keyFile: 'keys.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const sheets = google.sheets({ version: 'v4', auth });

// Gets the user info corresponding to a given slack name, attempting to match via first name.
// Returns a tuple of `[lastName, firstName, position, email, cell, home]` if the name was matched, and
// `undefined` if the name is not found in the spreadsheet.
export async function getInfo(name: string): Promise<string[] | undefined> {
    const res = await sheets.spreadsheets.values.get({
        auth, spreadsheetId,
        range: `B2:G33`
    });
    if (!res.data.values) return;

    const first = name.split(' ')[0];
    const data = res.data.values.find(row => row[1].trim().toLowerCase() === first.toLowerCase());
    if (!data) return;

    return data.map(x => x.trim());
}
