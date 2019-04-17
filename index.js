const CLIENT_ID = 'FweeGBOOEOYJWLJN3oEyToGLKhmSz0I7'
const PAGE_SIZE = 200
// Number of artists in each tier.
const SLOTS = {
  h0: 0,
  h1: 3,
  h2: 6,
  h3: 12,
  h4: 24,
  h5: 36,
  h6: 0
}
const SEPARATOR = ' \u2022 '
let results = []
let previousUserId

SC.initialize({
  client_id: CLIENT_ID
})

const showStatus = (msg) => {
  $('#status').text(msg)
}

const clearResults = () => {
  $('#h0').hide()
  Object.keys(SLOTS).forEach((element) => {
    $(`#${element}`).text('')
  })
}

const processAndDisplay = () => {
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
  console.log('number of results:', sortable.length)
  const defaultThreshold = sortable.length > 150 ? 2 : 1
  const weight = document.getElementById('weight').valueAsNumber
  const threshold = Number($('input[name=threshold]:checked').val()) || defaultThreshold
  console.log('threshold and weight', threshold, weight)
  sortable = sortable.filter((item) => {
    return item.counts.yourLikes >= threshold
  }).sort((a, b) => {
    return (a.counts.totalLikes * a.counts.yourLikes ** (weight - 1)) - (b.counts.totalLikes * b.counts.yourLikes ** (weight - 1))
  })
  showStatus('')
  $('#h0').show()
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

/**
 * Takes a user ID and returns a silly festival title
 */
const getTitle = (userId) => {
  SC.get(`/users/${userId}`).then((result) => {
    if (!result.username) { return }
    const name = result.username.split(' ').pop()
    const suffixes = ['fest', 'chella', ' in a Bottle', 'palooza', ` by ${name}west`, 'land']
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    $('#h0').text(`${name}${suffix} 2019`)
  })
}

const main = () => {
  clearResults()
  showStatus('generating a sick lineup...')
  const rss = $('#userId').val()
  const match = rss.match(/\d+/)
  if (!match) {
    showStatus('Error: Input was not a number or RSS link.')
    return
  }
  const userId = match[0]

  if (userId === previousUserId && results.length) {
    // use cached results
    console.log('using cached results')
    processAndDisplay()
    return
  }

  results = []
  previousUserId = userId
  getTitle(userId)

  SC.get(`/users/${userId}/favorites`, {
    limit: PAGE_SIZE,
    linked_partitioning: 1
  }).then((result) => {
    results = results.concat(result.collection)

    if (result.next_href) {
      $.getJSON(result.next_href, function (result) {
        results = results.concat(result.collection)

        if (result.next_href) {
          $.getJSON(result.next_href, function (result) {
            results = results.concat(result.collection)

            processAndDisplay()
          })
        } else {
          processAndDisplay()
        }
      })
    } else {
      processAndDisplay()
    }
  })
}

$('#go').click(main)
$('#controls input').change(main)
