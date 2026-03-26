
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.join(__dirname, '../src/config/rules.js');
const RULE_URLS_PATH = path.join(__dirname, '../src/config/ruleUrls.js');

const args = process.argv.slice(2);
const command = args[0];

function readRules() { return fs.readFileSync(RULES_PATH, 'utf-8'); }
function writeRules(content) { fs.writeFileSync(RULES_PATH, content, 'utf-8'); }
function readUrls() { return fs.readFileSync(RULE_URLS_PATH, 'utf-8'); }
function writeUrls(content) { fs.writeFileSync(RULE_URLS_PATH, content, 'utf-8'); }

function addRule() {
    const name = args.find(a => a.startsWith('--name='))?.split('=')[1];
    const sites = args.find(a => a.startsWith('--site='))?.split('=')[1]?.split(',') || [];
    const siteUrl = args.find(a => a.startsWith('--site-url='))?.split('=')[1];
    const ips = args.find(a => a.startsWith('--ip='))?.split('=')[1]?.split(',') || [];
    const ipUrl = args.find(a => a.startsWith('--ip-url='))?.split('=')[1];
    const isBalanced = args.includes('--balanced');
    const isMinimal = args.includes('--minimal');

    if (!name) {
        console.error('❌ 请提供策略组名称: --name="名称"');
        return;
    }

    let rulesContent = readRules();
    let urlsContent = readUrls();

    if (rulesContent.includes(`name: '${name}'`)) {
        console.error(`❌ 策略组 "${name}" 已存在`);
        return;
    }

    // 1. 处理自定义 URL
    let finalSites = [...sites];
    if (siteUrl) {
        const urlKey = `EXTERNAL_${name.toUpperCase().replace(/\s+/g, '_')}_SITE_URL`;
        if (!urlsContent.includes(urlKey)) {
            urlsContent = urlsContent.trim() + `\nexport const ${urlKey} = '${siteUrl}';\n`;
            writeUrls(urlsContent);
        }
        
        // 在 rules.js 的 SITE_RULE_SETS 注入逻辑
        const siteId = name.toLowerCase().replace(/\s+/g, '-');
        const injection = `		} else if (site_rule === '${siteId}') {
			acc[site_rule] = ${urlKey};`;
        
        rulesContent = rulesContent.replace(/(if \(site_rule === 'reiji-adblock'\) {[\s\S]*?)(} else {)/, `$1${injection}\n$2`);
        finalSites.push(siteId);
    }

    let finalIps = [...ips];
    // (IP URL 处理逻辑类似，此处为简洁先主要演示 Site URL)

    // 2. 构造策略组对象
    const newRule = `	{
		name: '${name}',
		site_rules: ${JSON.stringify(finalSites).replace(/"/g, "'")},
		ip_rules: ${JSON.stringify(finalIps).replace(/"/g, "'")}
	},`;

    rulesContent = rulesContent.replace(/(export const UNIFIED_RULES = \[)/, `$1\n${newRule}`);

    if (isBalanced) rulesContent = rulesContent.replace(/(balanced:\s*\[)/, `$1'${name}', `);
    if (isMinimal) rulesContent = rulesContent.replace(/(minimal:\s*\[)/, `$1'${name}', `);

    writeRules(rulesContent);
    console.log(`\n✅ 成功添加策略组并导入规则源: \x1b[32m${name}\x1b[0m`);
    if (siteUrl) console.log(`   - 远程源: ${siteUrl}`);
}

function printHelp() {
    console.log(`
🚀 Sublink Worker 策略组 & 远程源管理工具

用法:
  node scripts/manage-rules.mjs add --name="OpenAI" --site-url="https://.../openai.srs" --balanced

参数:
  --name="名称"             策略组名称
  --site="rule1,rule2"      使用内置 GeoSite 规则
  --site-url="URL"          使用自定义远程 .srs 规则文件
  --balanced                加入平衡预设
`);
}

switch (command) {
    case 'add': addRule(); break;
    case 'list': /* ... 原有 list 逻辑 ... */ break;
    default: printHelp();
}
