# Sideloading Blocked by Exchange

## Error Message
```
{"Error":{"Code":"BadRequest","Message":"Sideloading rejected by Exchange"}}
```

## What This Means

Your Exchange/Microsoft 365 administrator has **disabled custom add-in sideloading** for your organization. This is a common security policy in corporate environments to prevent unauthorized add-ins from being installed.

## Why This Happens

Organizations disable sideloading to:
- Maintain security and compliance
- Control which add-ins users can install
- Prevent data leakage through unauthorized add-ins
- Ensure only vetted add-ins are used

## Solutions

### Option 1: Request Admin Deployment (Recommended for Organizations)
Contact your IT administrator and ask them to:

1. **Enable Sideloading** (for testing):
   - Admin Center → Settings → Integrated apps → Custom app upload
   - Enable "Allow users to install custom add-ins"

2. **Deploy Centrally** (for production):
   - Admin Center → Settings → Integrated apps
   - Upload your manifest.xml
   - Assign to specific users or groups
   - This bypasses sideloading restrictions

### Option 2: Use Personal Microsoft Account
If you have a personal Microsoft account (outlook.com, hotmail.com):

1. Sign out of your work account
2. Go to https://outlook.com (personal Outlook)
3. Try installing there - personal accounts usually allow sideloading
4. Note: This only works for testing, not for your work emails

### Option 3: Development with Classic Outlook Desktop
If you have Classic Outlook desktop installed:

1. Classic Outlook may have different policies
2. Try sideloading there:
   ```bash
   npm run dev-server  # Keep running
   npm run sideload    # In new terminal
   ```
3. This uses local registry entries instead of Exchange

### Option 4: Request Policy Exception
Ask your IT admin to:
- Add you to a security group that allows sideloading
- Enable sideloading for developers/testers only
- Provide a test environment where sideloading is allowed

## How to Check Your Organization's Policy

### As a User:
1. Go to Outlook on the web
2. Click "Get Add-ins" button
3. Look for "My add-ins" → "Add a custom add-in"
4. If you see "Add from file" option but it fails, sideloading is blocked server-side

### As an Admin:
1. Microsoft 365 Admin Center
2. Settings → Integrated apps → Custom app upload
3. Check if "Allow users to install custom add-ins" is enabled

## Recommended Approach

### For Development/Testing:
1. **Best**: Ask admin to enable sideloading for your account
2. **Alternative**: Use personal Microsoft account for testing
3. **Workaround**: Use Classic Outlook desktop if available

### For Production Deployment:
1. **Required**: Admin must deploy centrally
2. Package your add-in properly
3. Provide manifest.xml to IT department
4. They deploy through Admin Center

## What You Can Do Right Now

### 1. Verify the Block
Try this PowerShell command (if you have admin access):
```powershell
Get-OrganizationConfig | Select-Object -Property *CustomApp*
```

### 2. Contact Your Admin
Send them this information:
- You're developing an Outlook add-in
- You need sideloading enabled for testing
- Or request central deployment for production use
- Provide your manifest.xml for review

### 3. Test Locally (Classic Outlook Only)
If you have Classic Outlook desktop:
```bash
npm install
npm run build
npm run dev-server  # Keep this running
npm run sideload    # In a new terminal
```

This uses Windows registry instead of Exchange, so it might work even if Exchange blocks sideloading.

## Important Notes

- ✅ Your manifest is valid and would work if sideloading was enabled
- ✅ All technical issues have been fixed
- ❌ The block is purely administrative/policy-based
- 🔒 This is a security feature, not a bug

## Next Steps

1. **Immediate**: Contact your IT administrator
2. **Short-term**: Request sideloading permission for development
3. **Long-term**: Plan for central deployment for production use

## Email Template for IT Admin

```
Subject: Request to Enable Custom Add-in Sideloading for Development

Hi [Admin Name],

I'm developing an Outlook add-in for [purpose] and need to test it in our 
organization's Outlook environment.

Currently, I'm getting "Sideloading rejected by Exchange" when trying to 
install the add-in via https://aka.ms/olksideload.

Could you please:
1. Enable custom add-in sideloading for my account, OR
2. Deploy the add-in centrally for testing purposes

The add-in manifest is attached for your review. It only requires 
ReadWriteItem permissions and runs entirely client-side.

Thank you!
```

## References

- [Microsoft Docs: Admin deployment](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins)
- [Enable/disable custom add-ins](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-addins-in-the-admin-center)
