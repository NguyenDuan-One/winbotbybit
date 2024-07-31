async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const handle = async (item)=>{
  await delay(2000)
  console.log('doing...',item);
}

handle(1)
handle(2)
handle(3)