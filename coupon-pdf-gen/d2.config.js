/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    name: 'coupon-pdf-gen',
    type: 'app',
    pluginType: 'CAPTURE',
    description: 'A DHIS2 app for coupon selection and PDF generation.',

    entryPoints: {
        plugin: './src/Plugin.tsx',
    },

    // direction: 'auto',
}

module.exports = config
