exports.handler = async (event, context) => {
  const adminUser = process.env.ADMIN_USER; // Access the environment variable

  return {
    statusCode: 200,
    body: JSON.stringify({ adminUser }),
  };
};
