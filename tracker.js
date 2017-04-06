const Athlete = require('./athlete')
const Cache = require('./cache')

const cache = new Cache()

function get(token, config) {
    const key = config.key || `tracker-${token}`
    return cache.get({
        key,
        keepAlive: true,
        createFn: () => new Tracker(token, config)
    })
}

class Tracker {
    constructor(token, config) {
        this._athlete = new Athlete(token, config)
    }

    athlete() {
        return this._athlete.athlete()
    }

    segments() {
        return this._athlete.segments()
    }

    effort(segment) {
        return this._athlete.effort(segment.id)
            .then(effort => Object.assign({}, segment, { positions: effort }))
    }

    active(point) {
        return this.getNearbySegments(point)
    }

    getNearbySegments(point) {
        return this.segments().then(segments => {
            const nearBy = segments.filter(s => this.isPointInRegion(point, s.start))
            return Promise.all(nearBy.map(s => this.effort(s)))
                    .then(close => close.filter(s => this.isOnSegment(point, s)))
        })
    }

    isOnSegment(point, segment) {
        return !!segment.positions.find(p => this.isPointClose(point, p))
    }

    isPointInRegion(p1, p2) {
        return this.distance(p1, p2) < 10000000
    }

    isPointClose(p1, p2) {
        return this.distance(p1, p2) < 10000
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
    }
}

module.exports = {
    get
}