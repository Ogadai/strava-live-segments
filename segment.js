const request = require('./request')
const Cache = require('./cache')

const cache = new Cache()

function get(token, athleteId, segmentId) {
    return cache.get({
        key: `athlete-${athleteId}-segment-${segmentId}`,
        createFn: () => new Segment(token, athleteId, segmentId)
    })
}

class Segment {
    constructor(token, athleteId, segmentId) {
        this.token = token
        this.athleteId = athleteId
        this.segmentId = segmentId
    }

    effort() {
        if (!this.effortPromise) {
            this.effortPromise = request.get(this.token, `/api/v3/segments/${this.segmentId}/all_efforts?athlete_id=${this.athleteId}&per_page=1`)
                    .then(efforts => efforts.length > 0 ? efforts[0] : null)
        }
        return this.effortPromise
    }

    stream() {
        if (!this.streamPromise) {
            this.streamPromise = this.effort().then(effort => {
                return effort
                        ? request.get(this.token, `/api/v3/segment_efforts/${effort.id}/streams/latlng?series_type=time&resolution=medium`)
                        : Promise.resolve(null)
            })
        }
        return this.streamPromise
    }

    map(mapFn) {
        return this.stream().then(stream => {
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