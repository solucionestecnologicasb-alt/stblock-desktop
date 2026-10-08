// Repair nested placeholder parsing from old OpenBlock imports without changing
// the user's block types, pins or field values.
const normalizeCategory = category => {
    for (const block of category.blocks || []) {
        if (!block.json || !block.info) continue;
        const args = block.info.arguments || {};
        for (const arg of block.json.args0 || []) {
            const nameForText = arg.name && arg.name.replace(/^\[+/, '');
            if (nameForText && String(block.info.text).includes(`[[${nameForText}]]`)) {
                const placeholder = `%${block.json.args0.indexOf(arg) + 1}]`;
                if (block.json.message0.includes(placeholder) && !block.json.message0.includes(`[${placeholder}`)) {
                    block.json.message0 = block.json.message0.replace(placeholder, `[${placeholder}`);
                }
            }
            if (!arg.name || args[arg.name] || !args[arg.name.replace(/^\[+/, '')]) continue;
            const old = arg.name;
            const name = old.replace(/^\[+/, '');
            arg.name = name;
            const value = String(args[name].defaultValue === undefined ? 0 : args[name].defaultValue);
            block.xml = block.xml.replace(`name="${old}"`, `name="${name}"`)
                .replace(`<value name="${name}"></value>`, `<value name="${name}"><shadow type="math_number"><field name="NUM">${Number(value) || 0}</field></shadow></value>`);
        }
    }
    return category;
};
module.exports = normalizeCategory;
