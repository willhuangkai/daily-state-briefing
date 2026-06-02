# Test Data Setup: Google Sheets Collection

This prototype stays static. There is no backend server, database, login, or API service.

Data is saved in two places:

1. The tester's browser localStorage as a backup.
2. Your Google Sheet through a Google Apps Script web app.

## What You Will Create

- One Google Sheet to store test submissions.
- One Google Apps Script attached to that Sheet.
- One public Apps Script web app URL.
- One small config change in `app.js`.

## Step 1: Create the Google Sheet

1. Go to https://sheets.google.com.
2. Create a new blank spreadsheet.
3. Rename it to `Daily State Briefing Test Data`.
4. Keep the first sheet tab. The script will rename it to `Submissions` and add headers automatically.

## Step 2: Open Apps Script

1. In the Google Sheet, click **Extensions**.
2. Click **Apps Script**.
3. Delete any starter code in `Code.gs`.
4. Paste this code:

```js
const SHEET_NAME = 'Submissions';

const HEADERS = [
  'Received At',
  'Entry ID',
  'Event Name',
  'Local Date',
  'Tester',
  'Age Range',
  'Role',
  'Report Type',
  'State',
  'Accurate',
  'Will Follow',
  'Follow Up',
  'Explanation',
  'Decision',
  'Inputs JSON',
  'Created At',
  'Page URL'
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Daily State Briefing collector is live.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const entry = payload.entry || {};
    const sheet = getSubmissionsSheet();
    const row = buildRow(payload, entry);
    const existingRow = findRowByEntryId(sheet, entry.id);

    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSubmissionsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.every((value, index) => value === HEADERS[index]);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function buildRow(payload, entry) {
  const feedback = entry.feedback || {};

  return [
    payload.submittedAt || new Date().toISOString(),
    entry.id || '',
    payload.eventName || '',
    entry.localDate || '',
    entry.tester || '',
    entry.ageRange || '',
    entry.role || '',
    entry.type || '',
    entry.state || '',
    feedback.accurate || '',
    feedback.willFollow || '',
    feedback.followUp || '',
    entry.explanation || '',
    entry.decision || '',
    JSON.stringify(entry.inputs || {}),
    entry.createdAt || '',
    payload.pageUrl || ''
  ];
}

function findRowByEntryId(sheet, entryId) {
  if (!entryId) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const matchIndex = ids.findIndex((row) => row[0] === entryId);

  return matchIndex === -1 ? null : matchIndex + 2;
}
```

5. Click **Save**.

## Step 3: Deploy the Apps Script Web App

1. In Apps Script, click **Deploy**.
2. Click **New deployment**.
3. Click the gear icon and choose **Web app**.
4. Set **Description** to `Daily State Briefing collector`.
5. Set **Execute as** to **Me**.
6. Set **Who has access** to **Anyone**.
7. Click **Deploy**.
8. Google may ask you to authorize the script. Approve it.
9. Copy the **Web app URL**. It should end in `/exec`.

## Step 4: Connect the Website to the Sheet

1. Open `app.js`.
2. Find this line near the top:

```js
const GOOGLE_SHEETS_WEB_APP_URL = "";
```

3. Paste your Apps Script web app URL between the quotes:

```js
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

4. Save `app.js`.
5. Redeploy the site on Vercel.

## Step 5: Test It

1. Open the deployed website.
2. Save a tester name.
3. Generate a Morning Report.
4. Choose the feedback answers.
5. Generate a Night Report.
6. Choose the feedback answers.
7. Open the Google Sheet.
8. Confirm rows appear in the `Submissions` tab.

## How Rows Work

Each report gets one row in the Sheet.

When a report is first generated, the row is created with empty feedback fields.

When the tester answers feedback, the same row is updated using the entry ID.

## What Is Stored

The Sheet stores:

- Received At
- Entry ID
- Event Name
- Local Date
- Tester
- Age Range
- Role
- Report Type
- State
- Accurate
- Will Follow
- Follow Up
- Explanation
- Decision
- Inputs JSON
- Created At
- Page URL

## Backup Behavior

The app still writes every report to browser localStorage first.

If the Google Sheets request fails, the local testing log still works in the tester's browser.

## Privacy Note

Do not ask testers to enter sensitive personal information. The tester name can be a short nickname or code.
