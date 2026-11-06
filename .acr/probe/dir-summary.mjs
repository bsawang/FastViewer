const response = JSON.parse(process.argv[2])
const entries = response.entries ?? []
const firstFile = entries.findIndex((entry) => entry.kind !== 'dir')
const cut = firstFile < 0 ? entries.length : firstFile
const dirsFirst =
  entries.slice(0, cut).every((entry) => entry.kind === 'dir') &&
  entries.slice(cut).every((entry) => entry.kind !== 'dir')

console.log(
  JSON.stringify(
    {
      path: response.path,
      parent: response.parent,
      total: response.total,
      offset: response.offset,
      limit: response.limit,
      entries: entries.length,
      dirsFirst,
      head: entries.slice(0, 6).map((entry) => `${entry.name}:${entry.kind}`),
    },
    null,
    1,
  ),
)
