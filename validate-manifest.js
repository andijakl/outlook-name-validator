const fs = require('fs');
const https = require('https');

// Read manifest content
const manifestContent = fs.readFileSync('manifest.xml', 'utf8');

console.log('🔍 Validating Outlook Add-in Manifest...\n');

// Extract URLs using regex (safer than XML parsing)
function extractUrls(content) {
  const urls = [];
  
  // Match DefaultValue="https://..." patterns
  const urlRegex = /DefaultValue="(https:\/\/[^"]+)"/g;
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  
  return [...new Set(urls)]; // Remove duplicates
}

const urls = extractUrls(manifestContent);

console.log('📋 Found URLs to validate:');
urls.forEach(url => console.log(`  - ${url}`));
console.log('');

// Validate each URL
async function validateUrl(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      resolve({
        url,
        status: response.statusCode,
        ok: response.statusCode >= 200 && response.statusCode < 300,
        headers: response.headers
      });
    });
    
    request.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        ok: false,
        error: error.message
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        ok: false,
        error: 'Request timeout'
      });
    });
  });
}

// Validate all URLs
async function validateAllUrls() {
  console.log('🌐 Validating URL accessibility...\n');
  
  const results = await Promise.all(urls.map(validateUrl));
  
  let allValid = true;
  results.forEach(result => {
    const status = result.ok ? '✅' : '❌';
    console.log(`${status} ${result.url}`);
    if (!result.ok) {
      console.log(`   Status: ${result.status}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      allValid = false;
    }
  });
  
  console.log('');
  
  if (allValid) {
    console.log('✅ All URLs are accessible!');
  } else {
    console.log('❌ Some URLs are not accessible. This will cause installation to fail.');
  }
  
  return allValid;
}

// Check required elements using regex
function validateStructure(content) {
  console.log('🏗️  Validating manifest structure...\n');
  
  const requiredElements = [
    { name: 'Id', pattern: /<Id>([^<]+)<\/Id>/ },
    { name: 'Version', pattern: /<Version>([^<]+)<\/Version>/ },
    { name: 'ProviderName', pattern: /<ProviderName>([^<]+)<\/ProviderName>/ },
    { name: 'DefaultLocale', pattern: /<DefaultLocale>([^<]+)<\/DefaultLocale>/ },
    { name: 'DisplayName', pattern: /<DisplayName[^>]*DefaultValue="([^"]+)"/ },
    { name: 'Description', pattern: /<Description[^>]*DefaultValue="([^"]+)"/ },
    { name: 'IconUrl', pattern: /<IconUrl[^>]*DefaultValue="([^"]+)"/ },
    { name: 'Hosts', pattern: /<Hosts>/ },
    { name: 'Requirements', pattern: /<Requirements>/ },
    { name: 'Permissions', pattern: /<Permissions>([^<]+)<\/Permissions>/ }
  ];
  
  let structureValid = true;
  
  requiredElements.forEach(element => {
    const match = content.match(element.pattern);
    if (!match) {
      console.log(`❌ Missing or invalid: ${element.name}`);
      structureValid = false;
    } else {
      console.log(`✅ Found: ${element.name}`);
      if (element.name === 'Id') {
        // Validate GUID format
        const id = match[1];
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(id)) {
          console.log(`❌ Invalid GUID format: ${id}`);
          structureValid = false;
        } else {
          console.log(`   GUID: ${id}`);
        }
      }
    }
  });
  
  console.log('');
  return structureValid;
}

// Run all validations
async function runValidation() {
  const structureValid = validateStructure(manifestContent);
  const urlsValid = await validateAllUrls();
  
  console.log('📊 Validation Summary:');
  console.log(`Structure: ${structureValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`URLs: ${urlsValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (structureValid && urlsValid) {
    console.log('\n🎉 Manifest validation passed! Ready for installation.');
  } else {
    console.log('\n⚠️  Manifest has issues that need to be fixed before installation.');
  }
}

runValidation().catch(console.error);