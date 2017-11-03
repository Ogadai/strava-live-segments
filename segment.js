const request = require('./request')
const Cache = require('./cache')

const cache = new Cache()

function get(token, athleteId, segmentId, startDate) {
    return cache.get({
        key: `athlete-${athleteId}-segment-${segmentId}-${startDate}`,
        createFn: () => new Segment(token, athleteId, segmentId, startDate)
    })
}

class Segment {
    constructor(token, athleteId, segmentId, startDate) {
        this.token = token
        this.athleteId = athleteId
        this.segmentId = segmentId
        this.startDate = startDate
    }

    effort() {
        if (!this.effortPromise) {
            const search = {
                athlete_id: this.athleteId,
                per_page: 1,
                start_date_local: this.startDate,
                end_date_local: this.startDate ? (new Date()).toISOString() : undefined
            };
            this.effortPromise = request.get(this.token, `/api/v3/segments/${this.segmentId}/all_efforts`, search)
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