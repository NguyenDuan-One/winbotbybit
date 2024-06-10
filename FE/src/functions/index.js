export const handleCheckAllCheckBox = (check) => {
    const treeNodeCheckAll = document.querySelector(".treeNodeCheckAll")
    if (treeNodeCheckAll) {
        treeNodeCheckAll.checked = !check
        treeNodeCheckAll.click()
    }
}