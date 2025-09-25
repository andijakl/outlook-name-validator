# Debugging 400 Bad Request Error in Outlook Add-in Installation

## Common Causes of 400 Error

### 1. **Manifest Validation Issues**
- Invalid XML structure
- Missing required elements
- Incorrect GUID format
- Invalid namespace declarations

### 2. **URL Accessibility Issues**
- URLs not accessible via HTTPS
- CORS issues
- SSL certificate problems
- 404 errors on referenced resources

### 3. **Outlook-Specific Requirements**
- Unsupported manifest version
- Invalid permissions
- Incorrect host specifications
- Missing or invalid VersionOverrides

## Debugging Steps

### Step 1: Use Minimal Manifest
Try installing `manifest-minimal.xml` instead of `manifest.xml`:
- This has fewer elements and can help isolate the issue
- If minimal works, gradually add elements back

### Step 2: Check Browser Network Tab
1. Open browser dev tools (F12)
2. Go to Network tab
3. Try installing the add-in
4. Click on the failed POST request
5. Check the Response tab for error details

### Step 3: Validate URLs
Run our validation script:
```bash
npm run validate-custom
```

### Step 4: Test Individual URLs
Manually test each URL from the manifest in your browser:
- https://andijakl.github.io/outlook-name-validator/taskpane.html
- https://andijakl.github.io/outlook-name-validator/commands.html
- https://andijakl.github.io/outlook-name-validator/assets/icon-16.png
- https://andijakl.github.io/outlook-name-validator/assets/icon-32.png
- https://andijakl.github.io/outlook-name-validator/assets/icon-80.png

### Step 5: Check CORS Headers
The server should return proper CORS headers. Check if GitHub Pages is setting:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

### Step 6: Try Different Installation Methods
1. **Direct file upload** (what you're doing)
2. **URL installation** (if supported)
3. **AppSource submission** (for production)

## Known Issues and Solutions

### Issue: Generic GUID
**Problem**: Using placeholder GUIDs like `12345678-1234-1234-1234-123456789012`
**Solution**: Use a unique GUID (already fixed in our manifest)

### Issue: Localhost URLs
**Problem**: Manifest contains `localhost` URLs
**Solution**: Use publicly accessible HTTPS URLs (already fixed)

### Issue: Missing HTTPS
**Problem**: HTTP URLs in manifest
**Solution**: All URLs must use HTTPS (already using HTTPS)

### Issue: Invalid Namespace
**Problem**: Incorrect XML namespaces
**Solution**: Use correct Microsoft Office namespaces (already correct)

## Alternative Testing Approaches

### 1. Use Office Add-in Validator
```bash
# Install Microsoft's official validator
npm install -g office-addin-manifest-validator

# Validate manifest
office-addin-manifest-validator manifest.xml
```

### 2. Test in Different Environments
- Try in different browsers
- Test with different Microsoft accounts
- Try in different Outlook environments (personal vs. work)

### 3. Simplify and Test
Create an even more minimal manifest with just:
- Basic metadata
- Single icon
- Simple taskpane
- No complex features

## Getting More Error Details

### Browser Console
Check for additional error messages in the browser console during installation.

### Network Response
The POST request to `https://titles.prod.mos.microsoft.com/dev/v1/users/packages/addins` might contain error details in the response body.

### Outlook Logs
Some versions of Outlook provide more detailed logging in the developer console.

## Next Steps if 400 Persists

1. **Try the minimal manifest** (`manifest-minimal.xml`)
2. **Check the actual HTTP response body** for specific error messages
3. **Test with a completely different add-in** to see if it's account-specific
4. **Contact Microsoft Support** if the issue persists with valid manifests