// HFS Tailwind Provider Plugin
// Bundles @tailwindcss/browser and exposes it to other HFS plugins via customApi.
// Optionally serves the JS file over HTTP at a configurable path.

exports.version = 2001.5; // scheme: (minor * 1000 + patch) . my_patch  ->  4.2.1 = 2001.0
exports.description = "Provides @tailwindcss/browser to other plugins and optionally serves it.";
exports.apiRequired = 8.65;
exports.author = "Feuerswut";
exports.repo = "Feuerswut/hfs-tailwind";

exports.customApi = {
    // Use in other plugins:
    //   const tw = api.customApiCall('tailwind')[0];
    //   tw.path   → absolute path to tailwind.js on disk
    //   tw.source → file contents as a string (et 20s to serve on a low-end machine)
    //   tw.buffer → file contents as a Buffer (fastest for serving)
    //   ^^^^^^^^^ this is STRONGLY RECOMMENDED TO USE
    tailwind: () => {
        const filePath = require('path').join(__dirname, 'tailwind/tailwind.js');
        return {
            path: filePath,
            get source() { return _tailwindBuffer ? _tailwindBuffer.toString('utf8') : require('fs').readFileSync(filePath, 'utf8'); },
            get buffer() { return _tailwindBuffer || require('fs').readFileSync(filePath); },
        };
    }
};

exports.config = {
    servePath: {
        type: 'string',
        defaultValue: '',
        label: 'Serve Path (optional)',
        helperText: 'URL path to serve tailwind.js. Leave empty to disable. Example: /some/path/tailwind.js'
    }
};

exports.configDialog = { maxWidth: 600 };

const path = require('path');
const fs   = require('fs');

const JS_FILE = path.join(__dirname, 'tailwind/tailwind.js');

exports.init = async api => {
    if (!fs.existsSync(JS_FILE)) {
        console.error('[hfs-tailwind] tailwind.js not found — reinstall or run the update workflow.');
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
            ctx.body   = 'tailwind.js not available';
            ctx.stop();
            return;
        }

        ctx.type = 'application/javascript';
        ctx.set('Cache-Control', 'public, max-age=86400'); // 1-day cache; file only changes on plugin update
        ctx.body = fs.createReadStream(JS_FILE);
        ctx.stop();
    }
};
