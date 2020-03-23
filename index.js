const CLIENT_ID = 'qy5YraPpqlufxQGsAhiNCCbDgtnUAgNx'
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

// Cached info
let results = []
let previousUserName
let previousUrl
let downloadUrl

SC.initialize({
  client_id: CLIENT_ID
})

/**
 * Gets a SoundCloud URL from a username if needed
 * @param {string} input
 */
const getSoundcloudUrl = (input) => {
  input = input.toLowerCase().trim()
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input
  }
  return `https://soundcloud.com/${input}`
}

/**
 * Show status or error to the user.
 * @param {string} msg
 * @param {boolean} showLoader
 */
const showStatus = (msg, showLoader) => {
  $('#status').text(msg)
  if (showLoader) {
    $('#loader').show()
  } else {
    $('#loader').hide()
  }
}

/**
 * Clear the results section. Called every time a parameter is changed.
 */
const clearResults = () => {
  document.getElementById('results').style.background = ''
  $('#h0').hide()
  Object.keys(SLOTS).forEach((element) => {
    $(`#${element}`).text('')
  })
}

/**
 * Given a soundcloud URL, this finds the corresponding user ID.
 * @param {string} scUrl
 * @param {Function<Number, string>} onSuccess
 * @param {Function} onError
 */
const getUserId = (scUrl, onSuccess, onFail) => {
  const resolveUrl =
    `https://api.soundcloud.com/resolve.json?url=${scUrl}&client_id=${CLIENT_ID}`
  $.getJSON(resolveUrl, (response) => {
    if (response.id) {
      onSuccess(response.id, response.username)
    } else {
      onFail(onFail)
    }
  }).fail(onFail)
}

/**
 * Calculate and render the results.
 */
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
  generateBackground()
  htmlToImage()
}

const setTitle = (userName) => {
  const name = userName.split(' ').pop()
  const names = [`${name}fest`, `${name}chella`, `${name} in a Bottle`,
    `${name}palooza`, `${name} by ${name}west`, `${name}land`,
    `${name}ing Man`, `Hardly Strictly ${name}`
  ]
  const festname = names[Math.floor(Math.random() * names.length)]
  $('#h0').text(`${festname.toUpperCase()} 2019`)
}

/**
 * Takes results and converts it to an image.
 * Based on
 * https://stackoverflow.com/questions/10721884/render-html-to-an-image
 * @param {HTML5Element} element
 * @returns {string}
 */
const htmlToImage = () => {
  html2canvas(document.getElementById('results'), {
    scale: 1,
    width: '740px'
  }).then((canvas) => {
    canvas.toBlob((blob) => {
      downloadUrl = window.URL.createObjectURL(blob)
      $('#download').attr('href', downloadUrl)
      $('#download').attr('download', `${previousUserName}-lineup.png`)
      $('#download').show()
    })
  })
}

/**
 * Generate a random gradient background, Coachella-style
 * based on https://codepen.io/chrisgresh/pen/aNjovb
 */
function generateBackground() {
  var hexValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e']
  function populate (a) {
    for (var i = 0; i < 6; i++) {
      var x = Math.round(Math.random() * 14)
      var y = hexValues[x]
      a += y
    }
    return a
  }
  var newColor1 = populate('#')
  var newColor2 = populate('#')
  var angle = Math.round(Math.random() * 360)
  var gradient = `linear-gradient(${angle}deg, ${newColor1}e0, ${newColor2}e0)`
  document.getElementById('results').style.background = gradient
  // document.getElementById("output").innerHTML = gradient;
}

const onSuccess = (userId, username) => {
  setTitle(username)
  previousUserName = username
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
const onFail = () => {
  showStatus('Error: Could not find SoundCloud user. Please check your spelling.')
}

/**
 * Download the results, sort and display them.
 */
const main = () => {
  clearResults()
  showStatus('', true)
  if (downloadUrl) {
    window.URL.revokeObjectURL(downloadUrl)
  }
  const scUrl = getSoundcloudUrl($('#userId').val())

  if (scUrl === previousUrl && results.length) {
    // use cached results
    console.log('using cached results')
    processAndDisplay()
    setTitle(previousUserName)
    return
  }

  results = []
  previousUrl = scUrl
  previousUserName = ''
  getUserId(scUrl, onSuccess, onFail)
}

$('#go').click(main)
$('#controls input').change(main)
$('#userId').on('keyup', function (e) {
  if (e.keyCode === 13) {
    main()
  }
})
