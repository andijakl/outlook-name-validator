# GitHub Pages Setup Guide

Follow these steps to publish your Outlook add-in to GitHub and host it on GitHub Pages.

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Click the "+" icon in the top right corner and select "New repository"
3. Repository settings:
   - **Repository name**: `outlook-name-validator`
   - **Description**: "Outlook add-in that validates recipient names in email greetings"
   - **Visibility**: Public (required for GitHub Pages on free accounts)
   - **Initialize**: Leave unchecked (we already have files)
4. Click "Create repository"

## Step 2: Update Manifest with Your GitHub Username

Replace `YOUR_GITHUB_USERNAME` in the manifest.xml with your actual GitHub username:

```bash
npm run update-manifest YOUR_ACTUAL_GITHUB_USERNAME
```

For example, if your GitHub username is `johnsmith`:
```bash
npm run update-manifest johnsmith
```

## Step 3: Push Code to GitHub

```bash
# Add all files to git
git add .

# Commit the files
git commit -m "Initial commit: Outlook Name Validator add-in"

# Add your GitHub repository as remote (replace YOUR_GITHUB_USERNAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/outlook-name-validator.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "GitHub Actions"
5. The workflow will automatically run and deploy your add-in

## Step 5: Wait for Deployment

- The GitHub Actions workflow will automatically build and deploy your add-in
- Check the "Actions" tab in your repository to see the deployment progress
- Once complete, your add-in will be available at:
  `https://YOUR_GITHUB_USERNAME.github.io/outlook-name-validator/`

## Step 6: Install the Add-in

1. Go to https://aka.ms/olksideload
2. Click "My add-ins" → "Custom Addins" → "Add a custom add-in" → "Add from file"
3. Upload your updated `manifest.xml` file
4. The add-in will install and sync to your New Outlook app

## Troubleshooting

- **Deployment failed**: Check the Actions tab for error details
- **404 errors**: Ensure GitHub Pages is enabled and deployment completed
- **Manifest errors**: Run `npm run validate` to check for issues
- **Installation failed**: Verify all URLs in manifest.xml are accessible

## Making Updates

After making changes to your code:

```bash
git add .
git commit -m "Description of your changes"
git push
```

The GitHub Actions workflow will automatically rebuild and redeploy your add-in.