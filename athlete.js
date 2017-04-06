const request = require('./request')
const segment = require('./segment')
const Cache = require('./cache')

const cache = new Cache()

function defaultMap({lat, lng}) {
    return {
        lng: lng,
        lat: lat
    }
}

class Athlete {
    constructor(token, config) {
        this.token = token
        this.config = config

        this.mapFn = this.config && this.config.map ? this.config.map : defaultMap
    }

    athlete() {
        if (!this.athletePromise) {
            this.athletePromise = request.get(this.token, '/api/v3/athlete')
        }
        return this.athletePromise
    }

    starred() {
        return cache.get({
            key: `starred-${this.token}`,
            createFn: () => request.get(this.token, '/api/v3/segments/starred')
                        .then(segments => segments.filter(this.filterStarred)
                                .map(s => this.mapSegment(s)))
        })
    }

    segments() {
        return this.starred().then(starred => 
            this.defaultSegments().then(segments => {
                starred.forEach(segment => {
                    if (!segments.find(s => s.id === segment.id)) {
                        segments.push(segment)
                    }
                })
                return segments
            })
        )
    }

    effort(segmentId) {
        return this.athlete().then(athlete => {
            return segment.get(this.token, athlete.id, segmentId).map(this.mapFn)
        })
    }

    defaultSegments() {
        if (this.config && this.config.segments) {
            return Promise.all(this.config.segments.map(id => this.loadSegment(id)))
        } else {
            return Promise.resolve([])
        }
    }

    loadSegment(id) {
        return cache.get({
            key: `segment-${id}`,
            keepAlive: true,
            createFn: () => request.get(this.token, `api/v3/segments/${id}`)
                    .then(s => this.mapSegment(s))
        })
    }

    filterStarred(segment) {
        return segment.activity_type === 'VirtualRide'
    }

    mapSegment(segment) {
        return {
            id: segment.id,
            name: segment.name,
            distance: segment.distance,
            start: this.mapLatLng(segment.start_latlng),
            end: this.mapLatLng(segment.end_latlng)
        }
    }

    mapLatLng(latLng) {
        return this.mapFn({ lat: latLng[0], lng: latLng[1] })
    }
}

module.exports = Athlete