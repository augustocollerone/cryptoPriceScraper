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

let filterSymbols = [
    "BTC", 
    "ETH", 
    "XRP", 
    "LTC", 
    "DOGE", 
    "USDT", 
    "NEO", 
    "ADA", 
    "USDC", 
    "CHZ", 
    "PAXG", 
    "SHIB", 
    "DOT", 
    "SOL", 
    "ADA"
]

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
            timeout: 100000
        })
            .then(response => {
                const data = response.data.data

                const articles = {}

                data.forEach(element => {
                    const symbol = element.symbol
                    const price = element.quote.USD.price

                    if (filterSymbols.includes(symbol)) {
                        articles[symbol] = price
                    }
                });

                // // Create items array
                // var items = Object.keys(articles).map(function (key) {
                //     return [key, articles[key]];
                // });

                // // Sort the array based on the second element
                // items.sort(function (first, second) {
                //     return filterSymbols.indexOf(a) - filterSymbols.indexOf(b);
                // });


                // Sort to match filter
                // articles = sort_object(articles)

                
                // articles.sort(function (a, b) {
                //     return filterSymbols.indexOf(a) - filterSymbols.indexOf(b);
                // });

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

function sort_object(obj) {
    items = Object.keys(obj).map(function(key) {
        return [key, obj[key]];
    });
    items.sort(function (a, b) {
        return filterSymbols.indexOf(a) - filterSymbols.indexOf(b);
    });
    sorted_obj={}



    $.each(items, function(k, v) {
        use_key = v[0]
        use_value = v[1]
        sorted_obj[use_key] = use_value
    })
    return(sorted_obj)
}

function latest() {

fetch("https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=100&sortBy=rank&sortType=desc&convert=USD,BTC,ETH&cryptoType=all&tagType=all&audited=false&aux=ath,atl,high24h,low24h,num_market_pairs,cmc_rank,date_added,max_supply,circulating_supply,total_supply,volume_7d,volume_30d,self_reported_circulating_supply,self_reported_market_cap", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "fvideo-id": "321ac11c3ac098a58b44fdef8199982a04ecf7e6",
    "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "x-request-id": "76ce4555-9a1f-4f01-8e28-f02020a26e70"
  },
  "referrer": "https://coinmarketcap.com/",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
});


}
 
app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))