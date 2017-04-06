const axios = require('axios');
const baseURL= 'https://www.strava.com';

function get(token, path) {
    return axios.get(path, {
        baseURL: baseURL,
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(response => response.data)
}

module.exports = {
    get
}
