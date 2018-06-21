const request = require('./request')
const Cache = require('./cache')

const cache = new Cache()

function get(token, athleteId, activityId) {
    return cache.get({
        key: `athlete-${athleteId}-activity-${activityId}`,
        createFn: () => new Activity(token, athleteId, activityId)
    })
}

class Activity {
    constructor(token, athleteId, activityId) {
        this.token = token
        this.athleteId = athleteId
        this.activityId = activityId
    }

    route() {
        if (!this.routePromise) {
            this.routePromise = request.get(this.token, `/api/v3/activities/${this.activityId}/streams/latlng?series_type=time&resolution=high`)
        }
        return this.routePromise
    }

    mapRoute(mapFn) {
        return this.route().then(stream => {
            const latLngData = stream ? stream.find(s => s.type === 'latlng') : null;
            const timeData = stream ? stream.find(s => s.type === 'time') : null;

            if (latLngData && timeData) {
                const firstTime = timeData.data[0]
                return latLngData.data.map((latLng, i) => {
                    let point = mapFn({ lat: latLng[0], lng: latLng[1] })
                    point.time = timeData.data[i] - firstTime
                    return point
                })
            } else {
                return null
            }
        })
    }
}

module.exports = {
    get
}
