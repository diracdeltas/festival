const CLIENT_ID = 'FweeGBOOEOYJWLJN3oEyToGLKhmSz0I7'
const PAGE_SIZE = 200
// Number of artists in each tier.
const SLOTS = {
  h1: 3,
  h2: 6,
  h3: 12,
  h4: 24,
  h5: 36
}
const SEPARATOR = ' \u2022 '

SC.initialize({
  client_id: CLIENT_ID
})

const showStatus = (msg) => {
  $('#status').text(msg)
}

const clearResults = () => {
  Object.keys(SLOTS).forEach((element) => {
    $(`#${element}`).text('')
  })
}

const processAndDisplay = (results, threshold) => {
  // Map of {<artist_name>: {yourLikes:..., totalLikes:...}>
  const artists = {}
  results.forEach((entry) => {
    const artistName = entry.user.username
    if (!artists[artistName]) {
      artists[artistName] = { yourLikes: 0, totalLikes: 0 }
    }
    artists[artistName].totalLikes += entry.likes_count
    artists[artistName].yourLikes += 1
  })
  let sortable = []
  for (let artist in artists) {
    const counts = artists[artist]
    sortable.push({ artist, counts })
  }
  sortable = sortable.filter((item) => {
    return item.counts.yourLikes > threshold
  }).sort((a, b) => {
    return a.counts.totalLikes - b.counts.totalLikes
  })
  showStatus('')
  for (let tier in SLOTS) {
    const num = SLOTS[tier]
    for (let i = 0; i < num; i++) {
      const next = sortable.pop()
      if (next) {
        const artist = next.artist
        if (i === 0) {
          $(`#${tier}`).text(artist)
        } else {
          $(`#${tier}`).text([$(`#${tier}`).text(), artist].join(SEPARATOR))
        }
      }
    }
  }
  if (sortable.length) {
    $('#h6').text(sortable.reverse().map(item => item.artist).join(SEPARATOR))
  }
}

$('#go').click(() => {
  clearResults()
  showStatus('generating a sick lineup...')
  const rss = $('#userId').val()
  const match = rss.match(/\d+/)
  if (!match) {
    showStatus('Error: Invalid RSS link.')
    return
  }
  const userId = match[0]
  let results = []
  SC.get(`/users/${userId}/favorites`, {
    limit: PAGE_SIZE,
    linked_partitioning: 1
  }).then((result) => {
    results = results.concat(result.collection)
    if (result.next_href) {
      $.getJSON(result.next_href, function (result) {
        results = results.concat(result.collection)
        processAndDisplay(results, 1)
      })
    } else {
      processAndDisplay(results, 0)
    }
  })
})
