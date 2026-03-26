import fs from 'fs';
import path from 'path';

const RULES_FILE = 'src/config/rules.js';

function addRule(displayName, internalKey) {
    const filePath = path.resolve(process.cwd(), RULES_FILE);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes(`name: '${displayName}'`)) {
        console.log(`⚠️ 规则 "${displayName}" 已存在，跳过。`);
        return;
    }

    const newEntry = `\t{\n\t\tname: '${displayName}',\n\t\tsite_rules: ['${internalKey}'],\n\t\tip_rules: []\n\t},`;

    const unifiedRulesMarker = 'export const UNIFIED_RULES = [';
    const insertIndex = content.indexOf(unifiedRulesMarker) + unifiedRulesMarker.length;
    content = content.slice(0, insertIndex) + '\n' + newEntry + content.slice(insertIndex);

    const balancedMarker = "balanced: [";
    const balancedIndex = content.indexOf(balancedMarker) + balancedMarker.length;
    content = content.slice(0, balancedIndex) + `'${displayName}', ` + content.slice(balancedIndex);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 成功添加规则: ${displayName}`);
}

const [name, key] = process.argv.slice(2);
if (!name || !key) {
    process.exit(1);
} else {
    addRule(name, key);
}
