// Jest 21 ships babel-jest 21 (Babel 6), while this project uses Babel 7.
const babel = require('@babel/core');
module.exports = {
    process (source, filename) {
        return babel.transformSync(source, {
            filename,
            babelrc: false,
            configFile: false,
            presets: [require.resolve('@babel/preset-env'), require.resolve('@babel/preset-react')],
            plugins: [require.resolve('@babel/plugin-syntax-dynamic-import')],
            sourceMaps: 'inline'
        }).code;
    }
};
