const express = require('express')
const axios = require('axios')

const baseURL = require('./strava-api').baseURL

function connect({ clientId, clientSecret, afterUrl }) {
    const app = express()

    app.get('/connect', function(req, res) {
        const thisUrl = `http://${req.headers.host}${req.originalUrl}`
        const tokenUrl = `${thisUrl.substring(0, thisUrl.lastIndexOf('/'))}/token`
        res.redirect(`${baseURL}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${tokenUrl}`)
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
                res.redirect(afterUrl)
            }).catch(responseError(res))
        } else {
            res.redirect(afterUrl)
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

    return app
}

connect.getToken = function getToken(req) {
    return req.cookies.stravaToken
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

module.exports = connect
