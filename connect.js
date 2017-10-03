const express = require('express')
const axios = require('axios')

const baseURL = require('./strava-api').baseURL

function connect({ clientId, clientSecret, afterUrl }) {
    const app = express()

    app.get('/connect', function(req, res) {
        const thisUrl = `http://${req.headers.host}${req.originalUrl}`
        const tokenUrl = `${thisUrl.substring(0, thisUrl.lastIndexOf('/'))}/token`

        const authUrl = `${baseURL}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${tokenUrl}`

        respondUrl(req, res, authUrl)
    })

    app.get('/disconnect', function(req, res) {
        const token = connect.getToken(req)
        if (token) {
            axios.post('/oauth/deauthorize', {}, {
                baseURL,
                headers: {
                    "Authorization": "Bearer " + token
                }
            }).then(response => {
                res.cookie('stravaToken', '', { path: '/', httpOnly: true })

                respondUrl(req, res, afterUrl)
            }).catch(responseError(res))
        } else {
            respondUrl(req, res, afterUrl)
        }
    })

    app.get('/token', function(req, res) {
        const errorMessage = req.query.error
        if (errorMessage) {
            console.log(`error: ${errorMessage}`)
            res.status(500).send(errorMessage)
            return
        }

        const code = req.query.code
        console.log(`code: ${code}`)
        const data = {
            client_id: clientId,
            client_secret: clientSecret,
            code
        }
        axios.post('/oauth/token', data, { baseURL }).then(response => {
            const expires = new Date()
            expires.setFullYear(expires.getFullYear() + 1)
            res.cookie('stravaToken', response.data.access_token, { path: '/', httpOnly: true, expires })
            res.redirect(afterUrl)
        }).catch(responseError(res))
    })

    app.get('/settings', function(req, res) {
        sendJson(res, connect.getSettings(req));
    })

    app.options('/settings', respondCORS)
    app.post('/settings', function(req, res) {
        const { startDate, startAge } = req.body
        const settingsCookie = JSON.stringify({ startDate, startAge })
        res.cookie('stravaSettings', settingsCookie, { path: '/', httpOnly: true })
        sendJson(res, {});
    })

    return app
}

connect.getToken = function getToken(req) {
    return req.cookies.stravaToken
}


connect.getSettings = function getSettings(req) {
    const settingsCookie = req.cookies.stravaSettings
    return settingsCookie ?
            JSON.parse(settingsCookie)
            : {};
}

function responseError(res) {
  return function (err) {
    if (err.response) {
      res.status(err.response.status).send(`${err.response.status} - ${err.response.statusText}`);
    } else {
      res.status(500).send(JSON.stringify(err));
    }
  }
}

function respondUrl(req, res, url) {
    if (isJson(req)) {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.send({ url });
    } else {
        res.redirect(url)
    }
}

function isJson(req) {
    return req.get('Accept').indexOf('application/json') !== -1
}

function respondCORS(req, res) {
  sendJson(res, {});
}

function sendJson(res, data) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Cache-Control', 'nocache');
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", 0);
  res.send(data);
}

module.exports = connect
