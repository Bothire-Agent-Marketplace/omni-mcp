module.exports = {
  sortFirst: [
    "name",
    "version",
    "private",
    "description",
    "author",
    "main",
    "type",
    "scripts",
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ],
  versionGroups: [
    {
      label: "Use workspace versions for all @mcp/* packages",
      packages: ["**"],
      dependencies: ["@mcp/**"],
      pinVersion: "workspace:*",
    },
  ],
};
