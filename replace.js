const fs = require('fs');
const path = require('path');
const target = 'process.env.NEXT_PUBLIC_GAS_API_URL';
const replacement = '"https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec"';

function explore(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      explore(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes(target)) {
        content = content.replaceAll(target, replacement);
        fs.writeFileSync(p, content, 'utf8');
        console.log('Updated', p);
      }
    }
  }
}
explore('src');
console.log('Done.');
