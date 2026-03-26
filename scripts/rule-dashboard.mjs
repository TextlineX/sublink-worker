
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const RULES_PATH = path.join(ROOT_DIR, 'src/config/rules.js');
const RULE_URLS_PATH = path.join(ROOT_DIR, 'src/config/ruleUrls.js');

const PORT = 3333;

async function getRules() {
    const content = await fs.readFile(RULES_PATH, 'utf-8');
    const match = content.match(/export const UNIFIED_RULES = (\[[\s\S]*?\]);/);
    if (!match) return [];
    try {
        return (new Function(`return ${match[1]}`))();
    } catch (e) {
        console.error("解析 JSON 失败:", e);
        return [];
    }
}

async function saveRules(rules, urlMappings = {}) {
    let rulesContent = await fs.readFile(RULES_PATH, 'utf-8');
    let urlsContent = await fs.readFile(RULE_URLS_PATH, 'utf-8');

    // 1. 更新 URL 映射
    for (const [tag, url] of Object.entries(urlMappings)) {
        const key = `EXTERNAL_${tag.toUpperCase().replace(/[-\s]/g, '_')}_URL`;
        if (!urlsContent.includes(key)) {
            urlsContent = urlsContent.trim() + `\nexport const ${key} = '${url}';\n`;
            
            // 在 rules.js 生成映射逻辑
            const injection = `		} else if (site_rule === '${tag}') {\n			acc[site_rule] = ${key};`;
            rulesContent = rulesContent.replace(/(if \(site_rule === 'reiji-adblock'\) {[\s\S]*?)(} else {)/, `$1${injection}\n$2`);
        }
    }
    await fs.writeFile(RULE_URLS_PATH, urlsContent);

    // 2. 更新 UNIFIED_RULES 代码
    const rulesCode = 'export const UNIFIED_RULES = [\n' + 
        rules.map(r => `	{
		name: '${r.name}',
		site_rules: ${JSON.stringify(r.site_rules || []).replace(/"/g, "'")},
		ip_rules: ${JSON.stringify(r.ip_rules || []).replace(/"/g, "'")}${r.type ? `,\n		type: '${r.type}'` : ''}${r.outbound ? `,\n		outbound: '${r.outbound}'` : ''}
	}`).join(',\n') + '\n];';

    const updated = rulesContent.replace(/export const UNIFIED_RULES = \[[\s\S]*?\];/, rulesCode);
    await fs.writeFile(RULES_PATH, updated, 'utf-8');
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>高级规则管理中心</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style> @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;900&display=swap'); body { font-family: 'Unbounded', system-ui; } </style>
</head>
<body class="bg-black text-white min-h-screen" x-data="proConsole()" x-init="load()">
    <!-- Modal -->
    <div x-show="showModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
        <div class="bg-zinc-950 border border-white/10 p-10 rounded-[3rem] w-full max-w-xl shadow-2xl scale-100" @click.away="closeModal()">
            <h2 class="text-3xl font-black mb-8 italic uppercase tracking-tighter">导入规则源</h2>
            <div class="space-y-6">
                <div>
                    <label class="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest">名称 / 标签 (Tag)</label>
                    <input x-model="tempTag" placeholder="例如: openai" class="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-white/10" />
                </div>
                <div>
                    <label class="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest">网络源地址 (URL - 可选)</label>
                    <input x-model="tempUrl" placeholder="例如: https://.../openai.srs" class="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-white/10" />
                </div>
                <div class="flex gap-4 mt-10">
                    <button @click="confirmTag()" class="flex-1 py-5 bg-white text-black rounded-3xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all uppercase italic">确认添加</button>
                    <button @click="closeModal()" class="px-8 py-5 bg-zinc-900 rounded-3xl font-black">取消</button>
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-5xl mx-auto py-20 px-4">
        <header class="mb-20 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
                <h1 class="text-6xl font-black tracking-tighter italic bg-gradient-to-br from-white to-zinc-600 bg-clip-text text-transparent">策略工坊</h1>
                <p class="text-zinc-500 font-bold mt-4 uppercase tracking-[0.4em] text-xs">Rule Discovery and Deployment Platform</p>
            </div>
            <button @click="save()" class="px-12 py-5 bg-white text-black rounded-[3rem] font-black text-xl hover:bg-zinc-200 transition-all flex items-center gap-4">
                <i class="fas fa-save"></i> 写回重构
            </button>
        </header>

        <div class="space-y-6">
            <template x-for="(rule, index) in rules" :key="index">
                <div class="bg-zinc-950 border border-white/5 p-10 rounded-[3.5rem] hover:border-white/20 transition-all">
                    <div class="flex flex-col lg:flex-row gap-10">
                        <div class="flex-1 space-y-8">
                            <div>
                                <input x-model="rule.name" class="text-4xl font-black italic bg-transparent border-none outline-none text-white focus:text-indigo-400 w-full transition-colors uppercase tracking-tighter" />
                            </div>
                            
                            <div class="flex flex-wrap items-center gap-4">
                                <div class="bg-zinc-900 flex p-1.5 rounded-2xl border border-white/5">
                                    <button @click="rule.outbound = ''" :class="!rule.outbound ? 'bg-white text-black' : 'text-zinc-500'" class="px-5 py-2 rounded-xl text-[10px] font-black uppercase">自定义组</button>
                                    <button @click="rule.outbound = 'DIRECT'" :class="rule.outbound === 'DIRECT' ? 'bg-indigo-600 text-white' : 'text-zinc-500'" class="px-5 py-2 rounded-xl text-[10px] font-black uppercase pl-6 pr-6">直连</button>
                                    <button @click="rule.outbound = 'REJECT'" :class="rule.outbound === 'REJECT' ? 'bg-rose-600 text-white' : 'text-zinc-500'" class="px-5 py-2 rounded-xl text-[10px] font-black uppercase pl-6 pr-6">拦截</button>
                                </div>
                                <select x-show="!rule.outbound" x-model="rule.type" class="bg-zinc-900 text-zinc-400 p-3 rounded-2xl border border-white/5 text-[10px] font-black focus:ring-0">
                                    <option value="selector">MANUAL SELECTOR</option>
                                    <option value="urltest">AUTO LOADBALANCER</option>
                                </select>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <template x-for="(tag, tIdx) in rule.site_rules">
                                    <span class="px-5 py-2 bg-zinc-900 rounded-2xl text-[10px] font-black tracking-widest border border-white/5 flex items-center gap-4 text-zinc-400 group/tag">
                                        <span x-text="tag.toUpperCase()"></span>
                                        <i @click="rule.site_rules.splice(tIdx, 1)" class="fas fa-times cursor-pointer hover:text-white"></i>
                                    </span>
                                </template>
                                <button @click="openModal(rule)" class="px-6 py-2 border-2 border-dashed border-zinc-800 text-zinc-600 rounded-2xl text-[10px] font-black uppercase hover:border-white/20 hover:text-white transition-all">+ 新增库</button>
                            </div>
                        </div>
                        <button @click="rules.splice(index, 1)" class="w-16 h-16 bg-zinc-900 text-zinc-700 hover:bg-rose-600 hover:text-white transition-all rounded-3xl flex items-center justify-center">
                            <i class="fas fa-trash-alt text-xl"></i>
                        </button>
                    </div>
                </div>
            </template>
        </div>

        <button @click="addRule()" class="w-full mt-10 py-16 border-4 border-dashed border-zinc-900 rounded-[4rem] text-zinc-800 hover:border-zinc-500 hover:text-zinc-400 transition-all flex flex-col items-center gap-4 uppercase font-black italic tracking-widest text-xl">
            Create Policy Suite
        </button>
    </div>

    <script>
        function proConsole() {
            return {
                rules: [],
                showModal: false,
                currentRule: null,
                tempTag: '',
                tempUrl: '',
                urlMappings: {},
                async load() {
                    const res = await fetch('/api/get');
                    this.rules = await res.json();
                },
                addRule() {
                    this.rules.push({ name: 'UNNAMED SERVICE', site_rules: [], ip_rules: [], outbound: '', type: 'selector' });
                },
                openModal(rule) {
                    this.currentRule = rule;
                    this.tempTag = '';
                    this.tempUrl = '';
                    this.showModal = true;
                },
                closeModal() {
                    this.showModal = false;
                },
                confirmTag() {
                    if (!this.tempTag) return;
                    this.currentRule.site_rules.push(this.tempTag);
                    if (this.tempUrl) {
                        this.urlMappings[this.tempTag] = this.tempUrl;
                    }
                    this.closeModal();
                },
                async save() {
                    await fetch('/api/save', { 
                        method: 'POST', 
                        body: JSON.stringify({ rules: this.rules, urlMappings: this.urlMappings }) 
                    });
                    this.urlMappings = {};
                    alert('✨ 系统核心库已重组，配置文件已应用。');
                }
            }
        }
    </script>
</body>
</html>
        `);
    } else if (req.url === '/api/get') {
        const rules = await getRules();
        res.end(JSON.stringify(rules));
    } else if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const data = JSON.parse(body);
            await saveRules(data.rules, data.urlMappings);
            res.end('OK');
        });
    }
});

server.listen(PORT, () => {
    console.log(`\n🌌 PRO 控制台启动: http://localhost:${PORT}\n`);
});
