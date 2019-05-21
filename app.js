/* ---------------------------- HEADER -----------------------------
Copyright 2019 Pierre LE DU

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see https://www.gnu.org/licenses/.
----------------------------------------------------------------- */


 /*
 *    INCLUDES
*/
const dj_parser = require(`./lib/DOM-JSON_parser.js`)
const html_parser = require(`jsdom`).JSDOM
const fs = require(`fs`)


 /*
 *    PARSE TICKET
*/
const pattern_path = `./patterns/ouisncf_pattern.json`
const ticket_path =  `./tickets/test.html`
const result_path =  `./results`
const result_name =  `result.json`


// Match current date with a date in the text, year does not compared
function match_dates (text, date_index, date_current) {
  // Get dates in the text
  let date = text.match(/\d{2}(\D)\d{2}\1\d{4}/g)[date_index].split(/(\D)/g).reverse().join(``)

  let date_target = new Date(`${date} UTC`)
  let date_result = new Date(date_current)
  // Compare day and month of the two dates, if true then get year of the text date
  if (date_target.getUTCDate() === date_result.getUTCDate() && date_target.getUTCMonth() === date_result.getUTCMonth()) {
    date_result.setUTCFullYear(date_target.getUTCFullYear())

    return date_result.toISOString()
  }
  return false
}


// Get pattern file
fs.readFile(pattern_path, (err, data) => {
  if (err) throw err

  // Convert pattern file to js object
  let pattern = JSON.parse(data)

  // Get ticket file, with 'UTF-8' charset
  fs.readFile(ticket_path, `utf8`, (err, html) => {
    if (err) throw err

    // Preparing html data file, delete \r\n and replace \" by "
    html = html.replace(/(?:\\[rn]|[\r\n]+)+/g, ``).replace(/\\"/g, `\"`)

    // Convert html ticket file to js DOM
    let document = new html_parser(html).window.document
    // Parse ticket from pattern
    dj_parser.parse(document, pattern, (result, complete) => {

      let travel_id = 0

      // Browse trips of result
      result.trips.forEach((trip) => {
        let roundTrips = trip.details.roundTrips

        // Browse roundTrips of trip
        for (let i = 0; i < roundTrips.length; i++) {
          let date_index = 0

          // Detect go back of the trip
          if (roundTrips[i].type === `Retour` && roundTrips[i].arrivalStation === roundTrips[i-1].arrivalStation) {
            travel_id--
            date_index = 1
          }

          try {
            // Get the dates of a travel in the document
            let textContent = document.querySelector(`#travel-${travel_id}  .pnr-summary`).textContent
            // Match dates of travel with date of the trip
            let date = match_dates(textContent, date_index, roundTrips[i].date)

            if (date) {
              // Date found, update the date of the trip
              roundTrips[i].date = date
            }
          } catch (error) {}

          travel_id++
        }
      })

      // Convert result to JSON
      const data = JSON.stringify({
        result,
        status: (complete) ? `ok` : `no completed`
      }, null, '\t')

      // Create result folder if does not exist
      fs.mkdir(result_path, (err) => {
        // Create result json file, write result
        fs.writeFile(`${result_path}/${result_name}`, data, (err) => {
          if (err) throw err

          console.log(`The file has been saved!`)
        })
      })
    })
  })
})
