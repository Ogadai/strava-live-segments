const express = require('express')
const cookieParser = require('cookie-parser')
const axios = require('axios')
const request = require('./request')
const connect = require('./connect')
const tracker = require('./tracker')

const port = 3002

const clientId = process.env.StravaClientId;
const clientSecret = process.env.StravaClientSecret;

const config = {
    segments: [
        12749402, 12744396, 12744360, 12109030, 12109305, 12118362, 14032406, 14270131,
        11596903, 11596925, 12109228, 12128029, 12744502, 12747814, 12749377, 12749649,
        12806756, 14032381
    ]
}

const app = express();
app.use(cookieParser())

app.use('/strava', connect({ clientId, clientSecret, afterUrl: '/athlete' }))

app.get('/athlete', function (req, res) {

  tracker.get(connect.getToken(req), config).athlete().then(result => {
        res.send(asHtml(result))
    }).catch(responseError(res))
})

app.get('/athlete/segments', function (req, res) {
  tracker.get(connect.getToken(req), config).segments().then(result => {
        res.send(asHtml(result))
    }).catch(responseError(res))
})

app.get('/athlete/effort/:segmentId', function(req, res) {
  const segmentId = req.params.segmentId;
  tracker.get(connect.getToken(req), config).effort(segmentId).then(result => {
        res.send(asHtml(result))
    }).catch(responseError(res))
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
})


function asHtml(data) {
  return '<html><body><pre><code>' + JSON.stringify(data, null, 4) + '</code></pre></body></html>'
}

function responseError(res) {
  return function (err) {
    console.log(err)
    if (err.response) {
      res.status(err.response.status).send(`${err.response.status} - ${err.response.statusText}`);
    } else {
      res.status(500).send(err.message);
    }
  }
}
