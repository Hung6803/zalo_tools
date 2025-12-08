const fs = require('fs');

const filePath = 'D:\\Project\\SourceCode\\clone_akaBiz\\desktop-app\\worker\\zalo-client.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Change function signature
content = content.replace(
  'maxPages: number = 10,',
  'maxPages?: number, // Optional - undefined = fetch ALL pages'
);

// Step 2: Change the if condition and log message
content = content.replace(
  `// Fetch additional pages if needed
      if (groupLinkInfo.hasMoreMember && maxPages > 1) {
        console.log(\`📄 Has more pages, fetching up to \${maxPages} pages...\`);

        for (let page = 2; page <= maxPages; page++) {`,
  `// Fetch ALL pages until no more members (unless maxPages is specified)
      if (groupLinkInfo.hasMoreMember) {
        console.log(\`📄 Fetching all remaining pages...\`);
        let page = 2;

        while (true) {
          // Stop if maxPages limit reached
          if (maxPages && page > maxPages) {
            console.log(\`⏹️  Reached maxPages limit (\${maxPages}), stopping\`);
            break;
          }`
);

// Step 3: Update log message to show progress
content = content.replace(
  `console.log(\`✅ Page 1: Found \${allMembers.length} members\`);`,
  `console.log(\`✅ Page 1: Found \${allMembers.length}/\${totalMembers} members\`);`
);

// Step 4: Update page log to show cumulative count
content = content.replace(
  `const pageMembers = pageInfo.currentMems || [];
            console.log(\`✅ Page \${page}: \${pageMembers.length} members\`);`,
  `const pageMembers = pageInfo.currentMems || [];
            console.log(\`✅ Page \${page}: \${pageMembers.length} members (Total: \${allMembers.length + pageMembers.length}/\${totalMembers})\`);`
);

// Step 5: Update the stopping condition message
content = content.replace(
  `if (!pageInfo.hasMoreMember) {
              console.log(\`✅ No more pages, stopping\`);
              break;
            }`,
  `if (!pageInfo.hasMoreMember) {
              console.log(\`✅ No more pages, completed at page \${page}\`);
              break;
            }`
);

// Step 6: Add page increment at the end of while loop (before the closing brace of try block)
content = content.replace(
  `// Small delay between pages to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (err: any) {
            console.warn(\`⚠️  Page \${page} error: \${err.message}\`);
            break;
          }
        }`,
  `// Small delay between pages to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
            page++;
          } catch (err: any) {
            console.warn(\`⚠️  Page \${page} error: \${err.message}\`);
            break;
          }
        }`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed maxPages to fetch ALL members by default!');
