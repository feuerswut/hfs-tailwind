// HFS Tailwind Provider Plugin
// Bundles @tailwindcss/browser and exposes it to other HFS plugins via customApi.
// Optionally serves the JS file over HTTP at a configurable path.

exports.version = 9.40300; // scheme: my_patch . encoded_tailwind_version  ->  4.3.0 = 8.40300
exports.description = "Provides @tailwindcss/browser to other plugins and optionally serves it.";
exports.apiRequired = 13;
exports.author = "feuerswut";
exports.repo = "feuerswut/hfs-tailwind";

exports.customApi = {
    // Use in other plugins:
    //   const tw = api.customApiCall('tailwind')[0];
    //   tw.path   → absolute path to tailwind.js on disk
    //   tw.source → file contents as a string (et 20s to serve on a low-end machine)
    tailwind: () => {
        const filePath = require('path').join(__dirname, 'tailwind/tailwind.js');
        return {
            path: filePath,
            get source() { return _tailwindBuffer ? _tailwindBuffer.toString('utf8') : require('fs').readFileSync(filePath, 'utf8'); }
        };
    }
};

exports.config = {
    servePath: {
        type: 'string',
        defaultValue: '',
        label: 'Serve Path (optional)',
        helperText: 'VFS path to serve tailwind.js. Leave empty to disable. Must match the full VFS path including any domain folder. Example: /feuerswut.de/res/js/tailwind.js',
    },
    debug: {
        type: 'boolean',
        defaultValue: false,
        label: 'Debug Logging',
        helperText: 'Log every incoming request path to the HFS console. Useful for diagnosing serve path issues.',
    },
};

exports.configDialog = { maxWidth: 600 };

const path = require('path');
const fs   = require('fs');
const JS_FILE = path.join(__dirname, 'tailwind/tailwind.js');

let _tailwindBuffer = null;

exports.init = async api => {
    if (!fs.existsSync(JS_FILE)) {
        api.log('[hfs-tailwind] tailwind.js not found — reinstall or run the update workflow.');
    } else {
        _tailwindBuffer = fs.readFileSync(JS_FILE);
        api.log(`[hfs-tailwind] loaded ${_tailwindBuffer.length} bytes`);
    }
    
    const stopListening = api.events.on('request', ({ ctx }) => {
        if (api.getConfig('debug'))
            api.log('[hfs-tailwind] request:', ctx.path);
        
        const servePath = (api.getConfig('servePath') || '').trim().replace(/\/+$/, '');
        
        if (!servePath || ctx.path !== servePath) return;
        
        if (!_tailwindBuffer) {
            ctx.status = 503;
            ctx.type   = 'text/plain';
            ctx.body   = 'tailwind.js not available';
        } else {
            ctx.type = 'application/javascript';
            ctx.set('Cache-Control', 'public, max-age=86400');
            ctx.body = _tailwindBuffer;
        }
        
        ctx.stop();
        
        return api.events.stop;
    });
    
    return { unload: stopListening };
};
