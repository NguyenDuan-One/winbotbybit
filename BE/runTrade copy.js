var a= 10

setTimeout(()=>{
    console.log(a);
},2000)

a = 15 

setTimeout(()=>{
    a = 20
},1000)