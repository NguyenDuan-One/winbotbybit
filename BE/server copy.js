
var obj = {}

const handle = (
  {
    strategy
  }
) => {
  strategy.coinOpen = 2
  obj["sd"] = {
    strategy,
    OC: true,
  }
}

handle({
  strategy:{
    a:1
  }
})
console.log(obj);
