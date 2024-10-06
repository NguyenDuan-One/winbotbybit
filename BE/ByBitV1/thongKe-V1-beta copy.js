const tinhOC = (symbol, dataAll = []) => {

    // console.log(dataAll, symbol, new Date().toLocaleString());


    if (dataAll.length > 0) {

        let OC = 0
        let TP = 0
        let OCLong = 0
        let TPLong = 0
        const vol = dataAll[dataAll.length - 1].turnover - dataAll[0].turnover || dataAll[0].turnover
        let OCNotPercent = 0
        let OCLongNotPercent = 0
        dataAll.forEach((data, index) => {

            const Close = +data.close
            const Open = +data.open
            const Highest = +data.high
            const Lowest = +data.low

            if (index === 0) {
                OCNotPercent = Highest - Open
                OC = OCNotPercent / Open 
                OCLongNotPercent = Lowest - Open
                OCLong = OCLongNotPercent / Open 
            }
            else {

                let TPTemp = Math.abs((Highest - Close) / OCNotPercent )
                let TPLongTemp = Math.abs((Lowest - Close) / OCNotPercent )
                let TPTemp2 = Math.abs((Highest - Close) / Math.abs(OCLongNotPercent) )
                let TPLongTemp2 = Math.abs((Lowest - Close) / Math.abs(OCLongNotPercent) )

                if ([Infinity, -Infinity].includes(TPTemp)) {
                    TPTemp = 0
                }
                if ([Infinity, -Infinity].includes(TPLongTemp)) {
                    TPLongTemp = 0
                }
                if ([Infinity, -Infinity].includes(TPTemp2)) {
                    TPTemp2 = 0
                }
                if ([Infinity, -Infinity].includes(TPLongTemp2)) {
                    TPLongTemp2 = 0
                }


                if (TPTemp > TP) {
                    TP = TPTemp
                }
                if (TPLongTemp > TPLong) {
                    TPLong = TPLongTemp
                }
                if (TPTemp2 > TP) {
                    TP = TPTemp2
                }
                if (TPLongTemp2 > TPLong) {
                    TPLong = TPLongTemp2
                }
            }
        })


        if ([Infinity, -Infinity].includes(OC)) {
            OC = 0
        }

        if ([Infinity, -Infinity].includes(OCLong)) {
            OCLong = 0
        }


        const OCRound = roundNumber(OC)
        const TPRound = roundNumber(TP)
        const OCLongRound = roundNumber(OCLong)
        const TPLongRound = roundNumber(TPLong)


        // if (OCRound >= 1 && TPRound > 0) {
        if (OCRound >= .4) {
            const ht = (` <b>${symbol.replace("USDT", "")}</b> - OC: ${OCRound}% - TP: ${TPRound}% - VOL: `)

            console.log(ht, new Date().toLocaleTimeString());
            console.log(dataAll);
        }
        // if (OCLongRound <= -1 && TPLongRound < 0) {
        if (OCLongRound <= -.4) {
            const htLong = (` <b>${symbol.replace("USDT", "")}</b> - OC: ${OCLongRound}% - TP: ${TPLongRound}% - VOL: `)
            console.log(htLong, new Date().toLocaleTimeString());
            console.log(dataAll);
        }

    }
}

const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}
tinhOC("demo",[
    {
      open: 0.0010734,
      close: 0.0010626,
      high: 0.0010734,
      low: 0.0010626,
      turnover: 1079.0516816999998,
      turnoverD: 3877.4110065
    },
    {
      open: 0.0010626,
      close: 0.0010626,
      high: 0.0010626,
      low: 0.0010626,
      turnover: 0,
      turnoverD: 3877.4110065
    },
    {
      open: 0.0010626,
      close: 0.0010682,
      high: 0.0010682,
      low: 0.0010626,
      turnover: 13.52768479999986,
      turnoverD: 3890.9386913
    }
  ])