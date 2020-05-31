const express = require('express');
const router = express.Router();
const cp = require('child_process');
const constants = require('../constants'), fs = require('fs');

function execute(command) {
    let commandArgs = command.split(" ")
    let exec = cp.spawnSync(commandArgs[0], commandArgs.slice(1, commandArgs.size));
    let output = exec.stdout.toString('utf8')
    console.log(output, exec.stderr.toString('utf8'));
    return output;
}

router.get('/', function (req, res) {
    res.render('certificateAuthority');
});

router.get('/createUser', function (req, res) {
    let CN = req.query.cn;
    let password = req.query.pw;
    generatePair(CN);
    createSigningRequest(CN);
    signWithCA(CN);
    combine(CN, password);
    emailCert(CN);
    res.end();
});

router.get('/revokeUser', function (req, res) {
    revokeCertificate(req.query.cn)
    createCRL();
    res.end();
});

router.get(('/checkRevoked'), function (req, res) {
    res.send(checkRevoked(req.query.cn));
});

router.get(('/index'), function (req, res) {
    res.send(getIndex());
});

function generatePair(CN) {
    console.log(`Generating pair for ${CN}`);
    execute(`openssl req -nodes -new -x509 -days 365 -sha256 -newkey rsa:2048 -keyout ./users/${CN}.key -subj /CN=${CN}/OU=${CN}`);
}

function createSigningRequest(CN) {
    console.log(`createSigningRequest for ${CN}`);
    execute(`openssl req -new -key ./users/${CN}.key -out ./users/${CN}.csr -sha256 -subj /CN=${CN}/OU=${CN}`);
}

function signWithCA(CN) {
    console.log(`signWithCA for ${CN}`);
    execute(`openssl ca -config /home/ec2-user/ca/ca.conf -batch -in ./users/${CN}.csr -cert /home/ec2-user/ca/ca.crt -keyfile /home/ec2-user/ca/ca.key -out ./users/${CN}.crt -subj /CN=${CN}/OU=${CN} -passin pass:${constants.caPass}`);
}

function combine(CN, password) {
    console.log(`combine for ${CN} with PW: ${password}`);
    execute(`openssl pkcs12 -export -passout pass:${password} -in ./users/${CN}.crt -inkey ./users/${CN}.key -certfile ./users/${CN}.crt -out ./users/${CN}.p12`);
}

function emailCert(CN) {
    console.log(`emailCert for ${CN}`);
    execute(`python scripts/emailCert.py ./users/${CN}.p12`);
}

function createCRL() {
    console.log(`createCRL`);
    execute(`openssl ca -config /home/ec2-user/ca/ca.conf -gencrl -out /home/ec2-user/ca/crl.pem -passin pass:${constants.caPass}`);
}

function getCRL() {
    return execute(`openssl crl -in /home/ec2-user/ca/crl.pem -noout -text`);
}

function revokeCertificate(CN) {
    console.log(`revokeCertificate for ${CN}`);
    let serialNumber = getSerialFromCN(CN);
    console.log("Serial#: " + serialNumber)
    execute(`openssl ca -config /home/ec2-user/ca/ca.conf -revoke /home/ec2-user/ca/ca.db.certs/${serialNumber}.pem -passin pass:${constants.caPass}`);
    console.log("Successfully revoked: " + checkRevoked(CN));
}

function getIndex() {
    let file = fs.readFileSync('/home/ec2-user/ca/ca.db.index', 'utf8');
    return file.split('\n');
}

function getSerialFromCN(CN) {
    console.log(`getSerialFromCN for ${CN}`);
    let fileLines = getIndex();
    let serialNumber = null;
    for (let i = 0; i < fileLines.length; i++) {
        if (fileLines[i].includes(CN)) {
            serialNumber = fileLines[i].split("\t")[3];
            break;
        }
    }
    return serialNumber;
}

function checkRevoked(CN) {
    console.log(`checkRevoked for ${CN}`);
    let serialNumber = getSerialFromCN(CN);
    console.log("Serial#: " + serialNumber)
    let file = getCRL();
    let fileLines = file.split('\n');
    for (let i = 0; i < fileLines.length; i++) {
        if (fileLines[i].includes("Serial Number: " + serialNumber)) {
            return true;
        }
    }
    return false
}

module.exports = router;
