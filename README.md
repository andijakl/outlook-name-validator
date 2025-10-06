# Outlook Name Validator Add-in

An Outlook add-in that validates recipient names mentioned in email content against actual email addresses to prevent addressing errors.

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Microsoft Outlook (web, new Outlook for Windows, or classic desktop)
- Office Add-ins development tools (for development only)

## Quick Start

### For End Users (Production Installation)

Simply download the built add-in and install it directly in Outlook - no development server required.

### For Developers

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. For development with hot reload:
```bash
npm run dev-server
```

## Development

### Available Scripts

- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run dev-server` - Start development server with hot reload (only needed for development)
- `npm run validate` - Validate the manifest file
- `npm run sideload` - Sideload the add-in for testing (Classic Outlook only)

### Project Structure

```
outlook-name-validator/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html
│   │   ├── taskpane.ts
│   │   └── taskpane.css
│   └── commands/
│       ├── commands.html
│       └── commands.ts
├── assets/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-80.png
│   └── logo-filled.png
├── dist/ (generated)
├── manifest.xml
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Features

This add-in validates recipient names in email greetings against the actual email addresses to help prevent addressing errors.

## How to Use the Add-in

### Accessing the Add-in

Once installed, the add-in appears when composing emails:

1. **Open Outlook on the web** or **new Outlook for Windows**
2. **Click "New message"** to compose an email (this is important - the add-in only works in compose mode)
3. In the compose window, look for the **"Validate Names"** button in the ribbon
   - In Outlook on the web: Look in the **"Message"** tab or click the **three dots (...)** menu → **"Apps"** → **"Name Validator"**
   - In new Outlook: Look in the ribbon under the **"Message"** tab
4. Click the button to open the Name Validator task pane on the right side

**Important**: The add-in only works when **composing or editing** an email, not when reading emails or in the main inbox view.

### Using the Validation

The add-in provides **manual validation** - it does NOT automatically prevent sending emails:

1. **Start composing an email** (click "New message" in Outlook)
2. **Add recipients** to the To/Cc/Bcc fields (e.g., john.smith@example.com)
3. **Write your email** with a greeting (e.g., "Hi John,")
4. **Open the Name Validator** add-in from the ribbon or Apps menu
5. **Click "Validate Names"** button in the task pane
6. The add-in will:
   - Extract names from your email greeting
   - Compare them against recipient email addresses
   - Show warnings if names don't match recipients
7. **Review the warnings** displayed in the task pane
8. **Manually correct** any mismatches before sending
9. The add-in **does not block sending** - you remain in control

### Common Issues When Using the Add-in

#### "Initialization failed" Error

**Cause**: You opened the add-in from the wrong place (inbox or reading an email)

**Solution**:
1. Close the add-in
2. Make sure you're in **compose mode** (writing a new email or reply)
3. Reopen the add-in from the compose window

#### "Must be used in email compose mode" Error

**Cause**: Same as above - not in compose mode

**Solution**: Only open the add-in when composing/editing an email, not when reading

#### Logo Image Not Found

**Cause**: Old build with incorrect path

**Solution**: 
```bash
npm run build
```
Then refresh your browser and reopen the add-in

### What Gets Validated

- **Greeting patterns**: "Hi", "Hello", "Dear", "Good morning/afternoon/evening" (English)
- **German greetings**: "Hallo", "Lieber/Liebe", "Sehr geehrte/geehrter", "Guten Morgen/Tag/Abend", "Moin"
- **Multiple recipients**: Handles greetings with multiple names (e.g., "Hi Anna and Peter,")
- **Name matching**: Compares extracted names against recipient email addresses and display names

### Settings

Click the **"Settings"** button in the task pane to configure:
- **Confidence threshold**: How strict the name matching should be
- **Warning display duration**: How long warnings stay visible
- **Success notifications**: Show/hide success messages
- **Language detection**: Auto-detect or force specific language

### Tips for Best Results

1. **Always compose first**: Open the add-in after you start composing, not before
2. **Add recipients early**: The validator needs recipients to compare against
3. **Check before sending**: Make it a habit to validate before clicking Send
4. **Review all warnings**: Even if you think it's correct, check the warnings
5. **Use settings**: Adjust the confidence threshold if you get too many/few warnings

### Language Support

The add-in supports multiple languages for greeting detection:

- **English**: Hi, Hello, Dear, Good morning/afternoon/evening, Greetings
- **German**: Hallo, Lieber/Liebe, Sehr geehrte/geehrter, Guten Morgen/Tag/Abend, Moin
- **Auto-detection**: Automatically detects the language based on email content

### Greeting Examples

**English:**
- `Hi John,` → extracts "John"
- `Dear Sarah,` → extracts "Sarah"
- `Hello Mike and Lisa,` → extracts "Mike" and "Lisa"

**German:**
- `Hallo Hans,` → extracts "Hans"
- `Lieber Herr Schmidt,` → extracts "Schmidt"  
- `Sehr geehrte Frau Müller,` → extracts "Müller"
- `Guten Morgen Maria,` → extracts "Maria"
- `Moin Klaus,` → extracts "Klaus"
- `Hallo Anna und Peter,` → extracts "Anna" and "Peter"

The system properly handles German characters (ä, ö, ü, ß) and normalizes them for matching.

### Validation Examples

✅ **Valid (No Warnings):**
- Greeting: "Hi John," → Recipient: john.smith@example.com
- Greeting: "Hallo Anna," → Recipient: anna.mueller@example.com
- Greeting: "Dear Dr. Smith," → Recipient: john.smith@example.com

⚠️ **Warning (Mismatch Detected):**
- Greeting: "Hi Mike," → Recipient: john.smith@example.com
- Greeting: "Dear Sarah," → Recipient: mike.jones@example.com
- Greeting: "Hallo Peter," → Recipient: anna.mueller@example.com

## Installation and Activation

### New Outlook App (Windows 1.2025.x)

**Important**: The new Outlook for Windows does not support direct add-in installation from files. You must install through Outlook on the web, which then syncs to the new Outlook app.

1. **Prepare the add-in** (one-time setup):
   ```bash
   npm install
   npm run build
   ```

2. **Install via Outlook Web (Required Method)**:
   - Open your browser and go to: https://aka.ms/olksideload
   - This opens Outlook on the web with the Add-Ins dialog
   - Go to "My add-ins"
   - Scroll to "Custom Addins" → "Add a custom add-in" → "Add from file"
   - Upload the `manifest.xml` file from this project
   - Click "Install"

3. **Sync to New Outlook**:
   - The add-in will automatically sync to your new Outlook for Windows app
   - This may take a few minutes due to caching
   - Restart the new Outlook app if the add-in doesn't appear immediately

4. **Verify Installation**:
   - The add-in should appear in your "My add-ins" list in both web and desktop
   - When composing a new email, you should see the Name Validator button in the ribbon
   - The add-in will automatically validate names as you type

**Why this limitation?** The new Outlook is based on web architecture and doesn't support COM add-ins. Microsoft plans to add native "Add from file" functionality in future updates, but currently only supports web-based installation.

### Classic Outlook (Desktop)

**Development server required** for sideloading in Classic Outlook.

1. **For automated installation**:
   ```bash
   npm install
   npm run build
   npm run dev-server  # Keep this running
   npm run sideload    # In a new terminal
   ```

2. **For manual installation**:
   - Ensure development server is running: `npm run dev-server`
   - Open Outlook desktop application
   - Go to File → Manage Add-ins → My add-ins
   - Click "Add a custom add-in" → "Add from file"
   - Select the `manifest.xml` file
   - Click "Install"

### Outlook on the Web

**Requires publicly hosted files** - cannot access localhost URLs.

1. **Deploy to Public Server**:
   - Host the built files on a public HTTPS server (GitHub Pages, Netlify, etc.)
   - Update manifest.xml URLs to point to your hosted files
   - Build the project: `npm run build`

2. **Install in Outlook Web**:
   - Open Outlook.com or your organization's Outlook web app
   - Click the "Get Add-ins" button in the toolbar
   - Select "My add-ins"
   - Click "Add a custom add-in" → "Add from file"
   - Upload the updated `manifest.xml` file with public URLs
   - Confirm installation

### Key Differences

- **New Outlook**: Must install via Outlook on the web (https://aka.ms/olksideload), then syncs to desktop app
- **Outlook Web**: Direct installation from web interface
- **Classic Outlook**: Requires development server running for sideloaded add-ins
- **Production deployment**: All versions can use centralized deployment without development servers

### Troubleshooting

#### "Installation failed. Add-in installation failed" Error

This generic error usually indicates one of several issues:

1. **Invalid or Missing Icons** (Very Common):
   - **Problem**: Icon files are corrupted, too small (placeholder files), or wrong format
   - **Solution**: Ensure icons are proper PNG files with correct dimensions (16x16, 32x32, 80x80 pixels)
   - **Check**: Icon files should be 1-10KB each, not just 74 bytes

2. **Localhost URLs in Production** (Most Common Issue):
   - **Problem**: The manifest.xml contains `https://localhost:3000` URLs, but Outlook on the web cannot access localhost on your PC
   - **Solution**: You must host the add-in files on a publicly accessible HTTPS server
   - **Note**: Starting a local dev server will NOT work for Outlook on the web installation - it can only access public URLs

3. **Manifest Validation Issues**:
   ```bash
   # Check for manifest errors
   npm run validate
   ```
   Common issues:
   - Invalid XML syntax
   - Missing required fields
   - Invalid URLs or resource references
   - Incorrect namespace declarations
   - Missing MobileFormFactor for new Outlook

4. **HTTPS Certificate Issues**:
   - All URLs in the manifest must use HTTPS
   - Self-signed certificates may cause issues in production
   - For development, ensure your dev server uses trusted certificates

5. **Resource Accessibility**:
   - All referenced files (HTML, CSS, JS, images) must be accessible via HTTPS
   - Check that icon files exist at the specified URLs
   - Verify taskpane.html and commands.html are properly built

#### Debugging Steps

1. **Validate Manifest**:
   ```bash
   npm run validate
   ```

2. **Check Resource URLs**:
   - Open each URL from the manifest in your browser
   - Ensure all resources load without errors
   - Verify HTTPS certificates are valid

3. **Test with Development Server** (Classic Outlook Only):
   ```bash
   npm run dev-server
   # This only works for Classic Outlook desktop, NOT for Outlook on the web
   ```

4. **Browser Developer Tools**:
   - Open browser dev tools (F12) during installation
   - Check Console and Network tabs for errors
   - Look for failed resource loads or CORS issues

5. **Simplified Manifest Test**:
   Create a minimal test manifest with only essential fields to isolate the issue

#### Production Deployment Solutions

For production use, you need to:

1. **Host on a Public Server**:
   - Deploy built files to a web server with HTTPS
   - Update manifest URLs to point to your hosted files
   - Examples: GitHub Pages, Azure Static Web Apps, Netlify

2. **Update Manifest URLs**:
   Replace all `https://localhost:3000` references with your production URLs

3. **Verify HTTPS Setup**:
   - Ensure valid SSL certificate
   - Test all resource URLs in browser
   - Check for mixed content warnings

#### Other Common Issues

- **Add-in not appearing**: Ensure your Outlook version supports add-ins
- **Classic Outlook issues**: Ensure development server is running on https://localhost:3000
- **New Outlook sync issues**: 
  - Wait a few minutes for sync to complete
  - Restart the new Outlook app
  - Verify the add-in appears in Outlook on the web first
  - Check that you're using the same Microsoft account in both web and desktop
- **Caching Issues**: Clear browser cache and restart Outlook
- **Corporate Policies**: Check if your organization blocks custom add-ins

## Testing

### Manual Testing Steps

1. Install the add-in via Outlook on the web (https://aka.ms/olksideload)
2. Compose a new email in Outlook
3. Add recipients (e.g., john.smith@example.com)
4. Write a greeting with a different name (e.g., "Hi Mike,")
5. Click the "Validate Names" button in the ribbon
6. The task pane should show a warning about the name mismatch
7. Test various greeting patterns and recipient combinations

### Test Scenarios

- **Single recipient mismatch**: Greeting says "Hi John" but recipient is mike@example.com
- **Multiple recipients**: "Hi Anna and Peter" with matching recipients
- **Partial matches**: "Hi Dr. Smith" with recipient john.smith@example.com
- **German greetings**: "Hallo Hans" with recipient hans.mueller@example.com
- **No greeting**: Email without greeting should show no warnings

## License

MIT