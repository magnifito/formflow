// import crypto from 'crypto';
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';
const envNames = nodeEnv === 'development'
  ? ['.env.development', '.env.dev']
  : nodeEnv === 'production'
    ? ['.env.production', '.env.prod']
    : nodeEnv === 'test'
      ? ['.env.test']
      : [`.env.${nodeEnv}`];

const roots = [];
let current = process.cwd();
for (let i = 0; i < 5; i += 1) {
  roots.push(current);
  const parent = path.dirname(current);
  if (parent === current) break;
  current = parent;
}

const findEnvFile = (names) => {
  for (const root of roots) {
    for (const name of names) {
      const candidate = path.join(root, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
};

const envPath = findEnvFile(envNames);
if (envPath) {
  dotenv.config({ path: envPath });
}
const basePath = findEnvFile(['.env']);
if (basePath) {
  dotenv.config({ path: basePath });
}
const generateRandomString = () => crypto.randomBytes(10).toString('hex');
const generateRandomInt = () => Math.floor(Math.random() * 1000000);

const createChallenge = (req, res) => {
    console.log("create challenge");
    const salt = generateRandomString();
    const secretNumber = generateRandomInt();
    const challenge = crypto.createHash('sha256').update(salt + secretNumber).digest('hex');
    const signature = crypto.createHmac('sha256', process.env.HMAC).update(challenge).digest('hex');

  res.json({
    algorithm: 'SHA-256',
    challenge,
    salt,
    signature,
  });
};


module.exports = createChallenge;
