const fs = require('fs');
const path = require('path');
// Resolve from the real package location so Jest 21 can follow pnpm's links.
module.exports = (request, options) => {
    const basedir = fs.realpathSync(options.basedir);
    try {
        return require.resolve(request, {paths: [basedir]});
    } catch (error) {
        if (request.startsWith('.') || path.isAbsolute(request)) {
            for (const extension of options.extensions || ['.js', '.jsx', '.json']) {
                for (const suffix of [extension, `/index${extension}`]) {
                    const filename = path.resolve(basedir, request + suffix);
                    if (fs.existsSync(filename)) return filename;
                }
            }
        }
        throw error;
    }
};
