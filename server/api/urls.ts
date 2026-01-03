export default defineSitemapEventHandler(async () => {
  const posts = await Promise.all([
    {
      _path: "/mens-eyeglasses",
      modifiedAt: new Date(),
    },
    {
      _path: "/womens-eyeglasses",
      modifiedAt: new Date(),
    },
    {
      _path: "/glasses-for-oval-face",
      modifiedAt: new Date(),
    },
    {
      _path: "/glasses-for-round-face",
      modifiedAt: new Date(),
    },
    {
      _path: "/glasses-for-square-face",
      modifiedAt: new Date(),
    },
    {
      _path: "/glasses-for-tyriangle-face",
      modifiedAt: new Date(),
    },
    {
      _path: "/glasses-for-heart-face",
      modifiedAt: new Date(),
    },
    {
      _path: "/mens-sunglasses",
      modifiedAt: new Date(),
    },
    {
      _path: "/womens-sunglasses",
      modifiedAt: new Date(),
    },
    {
      _path: "/kids-eyeglasses",
      modifiedAt: new Date(),
    },
  ]);
  return posts.map((post) => ({ loc: post._path, lastmod: new Date() }));
});
