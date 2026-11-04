import fs from 'node:fs';
const modules=['game','render','network','main'].map(name=>fs.readFileSync(`src/${name}.js`,'utf8').replace(/^import .*?;\n/gm,'').replace(/^export /gm,'')).join('\n');
let html=fs.readFileSync('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${fs.readFileSync('style.css','utf8')}</style>`).replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','').replace('<script type="module" src="src/main.js"></script>',`<script type="module">${modules.replaceAll('</script','<\\/script')}</script>`).replace('href="./"','href=""').replace('class="all-games" href="../"','class="all-games" href="https://greenkeewi.github.io/games/"');
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/Breach.html',html);
console.log('Built dist/Breach.html: self-contained solo game; P2P still requires network access.');
