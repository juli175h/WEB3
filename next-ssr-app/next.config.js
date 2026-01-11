/** Next.js config to proxy GraphQL to backend during dev */
module.exports = {
  async rewrites() {
    return [
      {
        source: "/graphql",
        destination: "http://localhost:4000/graphql",
      },
      {
        source: "/graphql/:path*",
        destination: "http://localhost:4000/graphql/:path*",
      },
    ];
  },
};
