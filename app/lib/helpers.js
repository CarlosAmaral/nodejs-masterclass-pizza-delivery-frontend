/*
* HELPERS
*/

const config = require("./config");
const https = require("https");
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const helpers = {};

helpers.isEmailValid = str => {
    const emailRegex = /\S+@\S+\.\S+/;

    if (typeof str == "string" && emailRegex.test(str)) {
        return true;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = str => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
};

helpers.createRandomString = strLength => {
    strLength = typeof strLength == "number" && strLength > 0 ? strLength : false;
    if (strLength) {
        const possibleChars = "abcdefghijklmnopqrstuvxyz123456789";
        let str = "";

        for (let i = 0; i < strLength; i++) {
            const randChar = possibleChars.charAt(
                Math.floor(Math.random() * possibleChars.length)
            );
            str += randChar;
        }

        return str;
    } else {
        return false;
    }
};

helpers.submitPayment = () => {

    return new Promise(function (resolve, reject) {
        const options = {
            hostname: config.stripe.hostname,
            path: config.stripe.path_charges,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + config.stripe.key
            }
        };

        https.get(options, res => {
            let body = '';
            res.on('data', (data) => {
                body += data;
            });

            res.on('end', () => {
                resolve(JSON.parse(body));
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
};

helpers.sendEmail = ({ name, email, cart }) => {

    return new Promise(function (resolve, reject) {
        const data = querystring.stringify({
            from: 'postmaster@sandboxd6655f04aa2c45988630115ad8882a0e.mailgun.org',
            to: `${email}`,
            subject: `Hello ${name}`,
            html: `<html><h1>Your order: </h1><div>${cart.map(i => i.item)}<div></html>`
        });

        const options = {
            hostname: config.mailgun.hostname,
            path: config.mailgun.path + '/' + config.mailgun.domain,
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`api:${config.mailgun.key}`).toString('base64')}`,
                "Content-Length": Buffer.byteLength(data)
            }
        };

        const response = https.request(options, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                resolve(chunk);
            });
        }).on("error", (err) => {
            reject(err);
        });

        // post the data
        response.write(data);
        response.end();
    });
};

helpers.getTemplate = (templateName, data, cb) => {
    templateName = typeof (templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {}

    if (templateName) {
        const templatesDir = path.join(__dirname, '/../templates/');
        fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
            if (!err && str && str.length > 0) {
                const interpolatedString = helpers.interpolate(str, data);
                cb(false, interpolatedString)
            } else {
                cb('No template found')
            }
        })
    } else {
        cb('Invalid template name')
    }
}

helpers.addUniversalTemplates = (str, data, cb) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : ''
    data = typeof(data) == 'object' && data !== null ? data : {}
    
    helpers.getTemplate('header', data, (err, headerStr) => {
        if(!err && headerStr){
            helpers.getTemplate('footer', data, (err, footerStr) => {
                if(!err && footerStr){
                    const fullStr = headerStr + footerStr;
                    cb(false, fullStr);
                } else {
                    cb('Not Found');
                }
            })
        } else {
            cb ("Not Found")
        }
    })
}

helpers.interpolate = (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : ''
    data = typeof(data) == 'object' && data !== null ? data : {}

    for (const key in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(key)){
            data['global.'+ key] = config.templateGlobals[key];
        }
    }

    for (const key in data) {
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            const replace = data[key];   
            const find = '{' + key + '}';
            str = str.replace(find, replace);
        }   
    }

    return str;
}

module.exports = helpers;
