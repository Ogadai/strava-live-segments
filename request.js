const axios = require('axios');
const baseURL= 'https://www.strava.com';

function get(token, path, params) {
    return axios.get(path, {
        baseURL: baseURL,
        headers: {
            "Authorization": "Bearer " + token
        },
        params
    })
    .then(response => response.data)
}

module.exports = {
    get
}
