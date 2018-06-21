const request = require('./request')
const segment = require('./segment')
const activity = require('./activity')
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

    activities() {
        return cache.get({
            key: `activities-${this.token}`,
            createFn: () => request.get(this.token, '/api/v3/athlete/activities?per_page=100')
                        .then(activities => activities.filter(a => this.filterActivity(a)))
        })
    }

    activity(activityId) {
        return this.athlete().then(athlete => {
            return activity.get(this.token, athlete.id, activityId).mapRoute(this.mapFn)
        })
    }

    starred() {
        return cache.get({
            key: `starred-${this.token}`,
            createFn: () => request.get(this.token, '/api/v3/segments/starred?per_page=200')
                        .then(segments => segments.filter(this.filterStarred))
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
                return segments.map(s => this.mapSegment(s))
            })
        )
    }

    effort(segmentId) {
        return this.athlete().then(athlete => {
            return segment.get(this.token, athlete.id, segmentId, this.config.startDate).map(this.mapFn)
        })
    }

    route(segmentId) {
        return this.athlete().then(athlete => {
            return segment.get(this.token, athlete.id, segmentId, this.config.startDate).mapRoute(this.mapFn)
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
        })
    }

    filterActivity(activity) {
        const distance = (p1, p2) => {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
        }
        if (activity.type === `VirtualRide`) {
            const start = this.mapLatLng(activity.start_latlng)
            if (distance(start, { x: 0, y: 0 }) < 10000000) {
                return true;
            }
        }
        return false;
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
