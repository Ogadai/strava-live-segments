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

        this.lastPoint = null
        this.lastTime = null
        this.current = []
    }

    athlete() {
        return this._athlete.athlete()
    }

    segments() {
        return this._athlete.segments()
    }

    effort(segmentId) {
        return this._athlete.effort(segmentId)
    }

    segmentWithEffort(segment) {
        return this._athlete.effort(segment.id)
            .then(effort => Object.assign({}, segment, { positions: effort }))
    }

    active(point) {
        return this.segments().then(segments => {
            const nearStartSegments = segments
                .filter(s => this.isPointInRegion(point, s.start))
                .filter(s => this.isNearStart(point, s))

            // Pre-load segment effort
            nearStartSegments.forEach(s => { this.effort(s.id) })

            // Filter for where we're actually crossing the start line
            const startingSegments = nearStartSegments
                .filter(s => this.isCrossingStartPoint(point, s))

            return Promise.all(startingSegments.map(s => this.setupSegmentPromise(point, s)))
                .then(newSegments => {
                    const current = this.current.concat(newSegments)

                    current.forEach(s => this.setSegmentStatus(point, s))

                    this.current = current.filter(s => !this.shouldRemove(s))

                    this.lastPoint = point
                    this.lastTime = dateNow()
                    return this.current
                            .filter(s => s.lastIndex > 1)
                            .map(toJson)
                })
        })
    }

    isPointInRegion(p1, p2) {
        return this.distance(p1, p2) < 10000000
    }

    isNearStart(point, segment) {
        if (this.lastPoint && point) {
            return this.isPointClose(point, segment.start)
        }
        return false
    }

    isCrossingStartPoint(point, segment) {
        const crossing = this.getPointCrossing(point, segment.start)
        return (crossing && this.distance(crossing.point, segment.start) < 1000)
    }

    getPointCrossing(point, endPoint) {
        if (this.lastPoint && point) {
            const lastToThis = this.distance(this.lastPoint, point)
            const lastToStart = this.distance(this.lastPoint, endPoint)
            const thisToStart = this.distance(point, endPoint)

            if (lastToStart < lastToThis && thisToStart < lastToThis) {
                const ratio = lastToStart / lastToThis
                const midPoint = {
                    x: this.lastPoint.x + (point.x - this.lastPoint.x) * ratio,
                    y: this.lastPoint.y + (point.y - this.lastPoint.y) * ratio
                }

                return {
                    point: midPoint,
                    time: this.lastTime + (dateNow() - this.lastTime) * ratio
                }
            }
        }
        return null
    }

    setupSegmentPromise(point, segment) {
        return this.segmentWithEffort(segment)
            .then(s => {
                if (s.positions && s.positions.length > 2) {
                    const crossing = this.getPointCrossing(point, s.start)
                    
                    return Object.assign({}, s, {
                        inProgress: true,
                        startTime: crossing.time,
                        lastIndex: 0,
                        lastIndexTime: crossing.time
                    })
                } else {
                    // No effort for this segment
                    return segment
                }
            })
    }

    setSegmentStatus(point, segment) {
        const points = segment.positions
        if (segment.finished || !points || points.length < 2) return

        let index = Math.min(segment.lastIndex + 1, points.length - 1)

        const distFn = index => this.distance(point, points[index])
        // Look along for the nearest point
        while(index < points.length - 1
                && distFn(index + 1) < distFn(index)) {
            index++
        }

        if (distFn(index - 1) < this.distance(points[index - 1], points[index])) {
            // Haven't passed this point yet
            index--
        }

        if (index >= points.length - 2) {
            const endCrossing = this.getPointCrossing(point, segment.end)
            if (endCrossing) {
                // Crossed the finish line
                segment.inProgress = false
                segment.finished = true
                segment.finishTime = endCrossing.time
                return
            }
        }

        const crossing = this.getPointCrossing(point, points[index])
        if (crossing) {
            segment.lastIndex = index
            segment.lastIndexTime = crossing.time
            
            let timeToPoint = segment.lastIndexTime - segment.startTime

            segment.difference = timeToPoint / 1000 - points[index].time
        } else {
            if (distFn(index) > 20000) {
                segment.inProgress = false
            }
        }
    }

    shouldRemove(segment) {
        return !(segment.inProgress
                || (segment.finished && dateNow() - segment.finishTime < 5000))
    }

    isPointClose(p1, p2) {
        return this.distance(p1, p2) < 10000
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
    }
}

function dateNow() {
    return Date.now()
}

function toJson(s) {
    return {
        id: s.id,
        name: s.name,
        start: s.start,
        end: s.end,
        startTime: s.startTime,
        endTime: s.endTime,
        finished: s.finished,
        difference: s.difference
    }
}

module.exports = {
    get
}