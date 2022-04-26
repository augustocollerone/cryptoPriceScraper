const PORT = 8000
const axios = require('axios')
const cheerio = require('cheerio')
const express = require('express')
const app = express()
const cors = require('cors')
const SocksProxyAgent = require('socks-proxy-agent');
const fs = require('fs');
const { addAbortSignal } = require('stream')

app.use(cors())

// FIRST NEED TO  RUN -> docker run -it -p 9050:9050 -d dperson/torproxy

const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');

app.get('/', function (req, res) {
    res.json('This is my webscraper')
})

app.get('/prices', async (req, res) => {

    let daysPerRequestLimit = req.query.limit
    let year = req.query.year
    let yearScrapeFileName = `scrape${year}.json`

    let rawdata = fs.readFileSync(yearScrapeFileName);
    let yearScrape = JSON.parse(rawdata);

    var yearStart = new Date(`01/01/${year}`);
    var yearEnd = new Date(`12/31/${year}`);
    var yearDaysCount = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 3600 * 24)

    console.log("*AC limit: ", daysPerRequestLimit)
    console.log("*AC START date: ", yearStart.toDateString())
    console.log("*AC END date: ", yearEnd.toDateString())
    console.log("*AC days count: ", yearDaysCount)


    var daysOfYear = [];
    for (var d = yearStart; d <= yearEnd; d.setDate(d.getDate() + 1)) {
        daysOfYear.push(d.toString());
    }

    const missingDays = daysOfYear.filter(e => {
        const d = new Date(e)
        var jsonDate = "" + d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0')

        return yearScrape.find(element => element["Date"] === jsonDate) == null
    })
    console.log("*AC missingDays: ", missingDays.length)

    const daysToFetch = missingDays.slice(0, daysPerRequestLimit);

    const prices = [];
    const errors = [];
    await Promise.all(daysToFetch.map(dateString => {

        const d = new Date(dateString)

        var urlDate = "" + d.getFullYear() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0')
        var jsonDate = "" + d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0')
        const url = `https://coinmarketcap.com/es/historical/${urlDate}/`

        return axios({
            url: url,
            httpsAgent: agent,
            timeout: 100000
        })
            .then(response => {
                const html = response.data
                const $ = cheerio.load(html)

                const articles = {}

                $('.cmc-table-row', html).each(function () { //<-- cannot be a function expression

                    const title = $($($(this).find("td")[1])).find("a").attr('title')
                    const symbol = $($(this).find("td")[2]).text()
                    const price = $($(this).find("td")[4]).text().replace(",", "").replace("$", "")

                    if (title) {
                        articles[symbol] = price
                    }
                })

                prices.push({
                    Date: jsonDate,
                    ...articles
                })

            }).catch(err => {
                errors.push(jsonDate)
                // console.log(`*AC ERROR on ${jsonDate}: `, err.message)
            })
    }
    ));

    yearScrape.push(...prices)

    yearScrape.sort(function (a, b) {
        return new Date(a["Date"]) - new Date(b["Date"])
    });

    let data = JSON.stringify(yearScrape);
    fs.writeFileSync(yearScrapeFileName, data);

    res.json({
        result: {
            success: prices.length,
            failure: errors.length
        },
        completion: `${yearScrape.length}/${yearDaysCount}`,
        data: yearScrape
    })

    console.log(`*AC DONE with ${errors.length} errors`)
})

app.get('/api', async (req, res) => {

    const wantedCoins = [
        "USDC",
        "BTC",
        "PAXG",
        "ETH",
        "USDT",
        "CHZ",
        "SHIB",
        "DOGE",
        "USD",
        "LTC",
        "ADA",
        "NEO",
        "XRP"
    ]

    let daysPerRequestLimit = req.query.limit
    let year = req.query.year
    let yearScrapeFileName = `scrape${year}.json`

    let rawdata = fs.readFileSync(yearScrapeFileName);
    let yearScrape = JSON.parse(rawdata);

    var yearStart = new Date(`01/01/${year}`);
    var yearEnd = new Date(`12/31/${year}`);
    var yearDaysCount = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 3600 * 24)

    console.log("*AC limit: ", daysPerRequestLimit)
    console.log("*AC START date: ", yearStart.toDateString())
    console.log("*AC END date: ", yearEnd.toDateString())
    console.log("*AC days count: ", yearDaysCount)


    var daysOfYear = [];
    for (var d = yearStart; d <= yearEnd; d.setDate(d.getDate() + 1)) {
        daysOfYear.push(d.toString());
    }

    const missingDays = daysOfYear.filter(e => {
        const d = new Date(e)
        var jsonDate = "" + d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0')

        return yearScrape.find(element => element["Date"] === jsonDate) == null
    })
    console.log("*AC missingDays: ", missingDays.length)

    const daysToFetch = missingDays.slice(0, daysPerRequestLimit);

    const prices = [];
    const errors = [];
    await Promise.all(daysToFetch.map(dateString => {

        const d = new Date(dateString)

        var jsonDate = "" + d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0')
        const url = `https://web-api.coinmarketcap.com/v1/cryptocurrency/listings/historical?convert=USD,USD,BTC&date=${jsonDate}&limit=300`
        console.log("*AC API: ", url)

        return axios({
            url: url,
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"96\", \"Google Chrome\";v=\"96\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Referer": "https://coinmarketcap.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            httpsAgent: agent,
            timeout: 200000
        })
            .then(response => {
                const data = response.data.data

                const articles = {}

                data.forEach(element => {
                    const symbol = element.symbol
                    const price = element.quote.USD.price

                    if (wantedCoins.includes(symbol)) {
                        articles[symbol] = price
                    }
                });

                prices.push({
                    Date: jsonDate,
                    ...articles
                })

            }).catch(err => {
                errors.push(jsonDate)
                console.log(`*AC ERROR on ${jsonDate}: `, err.message)
            })
    }
    ));

    yearScrape.push(...prices)

    yearScrape.sort(function (a, b) {
        return new Date(a["Date"]) - new Date(b["Date"])
    });

    let data = JSON.stringify(yearScrape);
    fs.writeFileSync(yearScrapeFileName, data);

    res.json({
        result: {
            success: prices.length,
            failure: errors.length
        },
        completion: `${yearScrape.length}/${yearDaysCount}`,
        data: yearScrape
    })

    console.log(`*AC DONE with ${errors.length} errors`)
})

app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))