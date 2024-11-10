module.exports = {
    apps: [{
        name: 'OEE_solution',
        script: './server.js',
        env: {
            NODE_ENV: 'development' // Standardmäßig Entwicklungsumgebung
        },
        env_production: {
            NODE_ENV: 'production'
        },
        env_development: {
            NODE_ENV: 'development'
        }
    }]
};