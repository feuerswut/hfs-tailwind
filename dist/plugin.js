// HFS Tailwind Provider Plugin
// Bundles @tailwindcss/browser and exposes it to other HFS plugins via customApi.
// Optionally serves the JS file over HTTP at a configurable path.

exports.version = 1018.0; // scheme: (minor * 1000 + patch) . my_patch  →  4.1.18 = 1018.0
exports.description = "Provides @tailwindcss/browser to other plugins and optionally serves it.";
exports.apiRequired = 8.65;
exports.author = "Feuerswut";
exports.repo = "Feuerswut/hfs-tailwind";

exports.customApi = {
    // Consume in other plugins:
    //   const { tailwind } = api.customApi['Feuerswut/hfs-tailwind']
    //   tailwind.path   → absolute path to tailwind-browser.js on disk
    //   tailwind.source → file contents as a string (lazy)
    tailwind: {
        get path() {
            return require('path').join(__dirname, 'tailwind-browser.js');
        },
        get source() {
            return require('fs').readFileSync(
                require('path').join(__dirname, 'tailwind-browser.js'), 'utf8'
            );
        },
    }
};

exports.config = {
    servePath: {
        type: 'string',
        defaultValue: '',
        label: 'Serve Path (optional)',
        helperText: 'URL path to serve tailwind-browser.js. Leave empty to disable. Example: /~/tailwind/tailwind.js'
    }
};

exports.configDialog = { maxWidth: 600 };

const path = require('path');
const fs   = require('fs');

const JS_FILE = path.join(__dirname, 'tailwind-browser.js');

exports.init = async api => {
    if (!fs.existsSync(JS_FILE)) {
        console.error('[hfs-tailwind] tailwind-browser.js not found — reinstall or run the update workflow.');
    }
    return { middleware };

    async function middleware(ctx) {
        const servePath = (api.getConfig('servePath') || '').trim().replace(/\/+$/, '');
        if (!servePath) return;

        const url = ctx.req.url.split('?')[0];
        if (url !== servePath) return;

        if (!fs.existsSync(JS_FILE)) {
            ctx.status = 503;
            ctx.type   = 'text/plain';
            ctx.body   = 'tailwind-browser.js not available';
            ctx.stop();
            return;
        }

        ctx.type = 'application/javascript';
        ctx.set('Cache-Control', 'public, max-age=86400'); // 1-day cache; file only changes on plugin update
        ctx.body = fs.createReadStream(JS_FILE);
        ctx.stop();
    }
};
