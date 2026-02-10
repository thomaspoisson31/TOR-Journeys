exports.handler = async (event, context) => {
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: "Cette fonctionnalité n'est plus disponible"
  };
};
