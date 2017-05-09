if (process.env.NODE_ENV === 'production') {
    module.exports = require('./config.prod.js')
} else {
    if (process.argv.indexOf("--cus") >= 0) {
        module.exports = require('./config.cus.js')
    } else {
        module.exports = require('./config.dev.js')
    }
}
