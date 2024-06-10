export const handleCheckAllCheckBox = (check) => {
    const treeNodeCheckAll = document.querySelector(".treeNodeCheckAll")
    if (treeNodeCheckAll) {
        treeNodeCheckAll.checked = !check
        treeNodeCheckAll.click()
    }
}

export const formatNumber = number=>{
    
    return (number > 0 ? number : 0).toLocaleString("en-EN")
    return new Intl.NumberFormat("en-EN").format(number > 0 ? number : 0) || 0

}