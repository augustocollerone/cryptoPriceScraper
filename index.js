const PORT = 8000
const axios = require('axios')
const cheerio = require('cheerio')
const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors())

var startDate = new Date("01/01/2021");
var endDate = new Date("01/31/2021"); // MM DD YYYY

app.get('/', function (req, res) {
    res.json('This is my webscraper')
})

app.get('/prices', async (req, res) => {

    console.log("*AC START date: ", startDate.toDateString())
    console.log("*AC END date: ", endDate.toDateString())

    var now = endDate
    var daysOfYear = [];
    const prices = [];
    
    for (var d = startDate; d <= now; d.setDate(d.getDate() + 1)) {        
        daysOfYear.push(d.toString());
    }

    console.log("*AC days = ", daysOfYear)

    await Promise.all(daysOfYear.map(dateString => {

        const d = new Date(dateString)

        var urlDate = "" + d.getFullYear() + (d.getMonth()+1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0')        
        var jsonDate = "" + d.getFullYear() + "-" + (d.getMonth()+1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0')        
        const url = `https://coinmarketcap.com/es/historical/${urlDate}/`

        console.log("*AC url = ", jsonDate)

        return axios(url)
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

        }).catch(err => console.log(err))
    }
    ));

    prices.sort(function(a,b){
        return new Date(a["Date"]) - new Date(b["Date"])
    });

    res.json(prices)
})

app.get('/results', (req, res) => {
    axios(url)
        .then(response => {
            const html = response.data
            const $ = cheerio.load(html)
            const articles = []

            $('.fc-item__title', html).each(function () { //<-- cannot be a function expression
                const title = $(this).text()
                const url = $(this).find('a').attr('href')
                articles.push({
                    title,
                    url
                })
            })
            res.json(articles)
        }).catch(err => console.log(err))
})


app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))