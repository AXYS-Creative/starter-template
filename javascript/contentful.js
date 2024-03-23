const contentful = require("contentful");

const client = contentful.createClient({
  space: "gp2laug2nl23",
  environment: "master", // defaults to 'master' if not set
  accessToken: "x7E19g_TZe9KvoR-hyCjZ5qbi77Yw_BPK4U2YGpIxmg",
});

client
  .getEntry("2v2Rn5aJ6NvftsmaJWXjxf")
  .then((entry) => console.log(entry))
  .catch(console.error);
