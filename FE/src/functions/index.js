export const handleCheckAllCheckBox = (check) => {
    const treeNodeCheckAll = document.querySelector(".treeNodeCheckAll")
    if (treeNodeCheckAll) {
        treeNodeCheckAll.checked = !check
        treeNodeCheckAll.click()
    }
}

export const formatNumber = number => {
    return number > 0 ? number.toFixed(2) : 0
    return (number > 0 ? number : 0).toLocaleString("en-EN")
    return new Intl.NumberFormat("en-EN").format(number > 0 ? number : 0) || 0

}
export const formatNumberString = number => {
    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(2) + 'B';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(2) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(2) + 'K';
    } else {
        return number.toString();
    }
}

export const removeLocalStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("roleList");
}