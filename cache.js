const NodeCache = require('node-cache')

class Cache {
    constructor({stdTTL = 600, checkPeriod = 120, useClones = false} = {}) {
        this.stdTTL = stdTTL
        this.cache = new NodeCache({ stdTTL, checkPeriod, useClones })
    }

    get({key, keepAlive, createFn}) {
        const cached = this.cache.get(key);
        if (cached) {
            if (keepAlive) this.cache.ttl(key, this.stdTTL);
            return cached;
        }

        const newInstance = createFn();
        this.cache.set(key, newInstance);
        return newInstance;
    }
}

module.exports = Cache
