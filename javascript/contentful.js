require("dotenv").config();

const contentful = require("contentful");

const contentfulSpace = process.env.CONTENTFUL_SPACE;
const contentfulAccessToken = process.env.CONTENTFUL_ACCESS_TOKEN;

const client = contentful.createClient({
  space: contentfulSpace,
  environment: "master", // defaults to 'master' if not set
  accessToken: contentfulAccessToken,
});

client
  .getEntry("2v2Rn5aJ6NvftsmaJWXjxf")
  .then((entry) => console.log(entry))
  .catch(console.error);
