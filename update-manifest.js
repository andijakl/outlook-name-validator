const fs = require('fs');
const path = require('path');

// Get GitHub username from command line argument
const githubUsername = process.argv[2];

if (!githubUsername) {
  console.error('Please provide your GitHub username as an argument:');
  console.error('node update-manifest.js YOUR_GITHUB_USERNAME');
  process.exit(1);
}

// Read the manifest file
const manifestPath = path.join(__dirname, 'manifest.xml');
let manifestContent = fs.readFileSync(manifestPath, 'utf8');

// Replace all instances of the placeholder
manifestContent = manifestContent.replace(/YOUR_GITHUB_USERNAME/g, githubUsername);

// Write the updated manifest back
fs.writeFileSync(manifestPath, manifestContent);

console.log(`✅ Updated manifest.xml with GitHub username: ${githubUsername}`);
console.log(`🌐 Your add-in will be hosted at: https://${githubUsername}.github.io/outlook-name-validator/`);