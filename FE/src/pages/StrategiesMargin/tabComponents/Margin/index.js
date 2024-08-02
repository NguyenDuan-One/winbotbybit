
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, CircularProgress, FormLabel, FormControl, Tooltip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import AddBreadcrumbs from '../../../../components/BreadcrumbsCutom';
import { handleCheckAllCheckBox } from '../../../../functions';
import { getAllBotActiveByUserID } from '../../../../services/botService';
import { getTotalFutureByBot, getAllStrategies, syncSymbol } from '../../../../services/dataCoinByBitService';
import { addMessageToast } from '../../../../store/slices/Toast';
import { setTotalFuture } from '../../../../store/slices/TotalFuture';
import CreateStrategy from '../../components/CreateStrategy';
import EditMulTreeItem from '../../components/EditMulTreeItem';
import FilterDialog from '../../components/FilterDialog';
import TreeParent from '../../components/TreeView/TreeParent';
import clsx from 'clsx';

function Margin() {

    const userData = useSelector(state => state.userDataSlice.userData)

    const SCROLL_INDEX = 5
    const SCROLL_INDEX_FIRST = window.innerHeight / 30

    const botTypeList = [
        {
            name: "All",
            value: "All"
        },
        {
            name: "BybitV3",
            value: "BybitV3"
        }
    ]

    const positionSideList = [
        {
            name: "All",
            value: "All",
        },
        {
            name: "Long",
            value: "Long",
        },
        {
            name: "Short",
            value: "Short",
        },
    ]

    const candlestickList = [
        {
            name: "All",
            value: "All",
        },
        {
            name: "1m",
            value: "1m",
        },
        {
            name: "3m",
            value: "3m",
        },
        {
            name: "5m",
            value: "5m",
        },
        {
            name: "15m",
            value: "15m",
        },
        // {
        //     name: "30m",
        //     value: "30m",
        // },
        // {
        //     name: "60m",
        //     value: "60m",
        // },
    ]


    const [openFilterDialog, setOpenFilterDialog] = useState(false);
    const [openEditTreeItemMultipleDialog, setOpenEditTreeItemMultipleDialog] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [openCreateStrategy, setOpenCreateStrategy] = useState({
        isOpen: false,
        dataChange: false,
        symbolValueInput: ""
    });

    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);

    const dataCheckTreeSelectedRef = useRef([])
    const dataCheckTreeDefaultRef = useRef([])
    const dataCheckTreeRef = useRef([])
    const [dataCheckTree, setDataCheckTree] = useState([]);
    const [loadingUploadSymbol, setLoadingUploadSymbol] = useState(false);
    const [dataTreeViewIndex, setDataTreeViewIndex] = useState(SCROLL_INDEX_FIRST);

    // Filter
    const [botTypeSelected, setBotTypeSelected] = useState("All");
    const [botSelected, setBotSelected] = useState("All");
    const [positionSideSelected, setPositionSideSelected] = useState(positionSideList[0].value);
    const [candlestickSelected, setCandlestickSelected] = useState(candlestickList[0].value);

    const filterQuantityRef = useRef([])
    const searchRef = useRef("")
    const selectAllRef = useRef(false)

    const dispatch = useDispatch()


    const countTotalActive = useMemo(() => {
        let countActive = 0
        let totalItem = 0

        dataCheckTree.forEach(item => {
            countActive += item?.children?.filter(itemChild => itemChild.IsActive).length || 0
            totalItem += item?.children.length || 0
        })
        return {
            countActive,
            totalItem
        }
    }, [dataCheckTree])

    const handleGetAllBotByUserID = () => {

        getAllBotActiveByUserID(userData._id)
            .then(res => {
                const data = res.data.data;
                const newData = data?.map(item => (
                    {
                        name: item?.botName,
                        value: item?._id,
                    }
                ))
                const newMain = [
                    {
                        name: "All",
                        value: "All"
                    },
                    ...newData
                ]
                setBotList(newMain)
            })
            .catch(error => {
            }
            )
    }
    const handleGetTotalFutureByBot = async () => {

        try {
            const res = await getTotalFutureByBot(userData._id)
            const { status, message, data: resData } = res.data

            dispatch(setTotalFuture({
                total: resData || 0
            }))

            // if (status !== 200) {
            //     dispatch(addMessageToast({
            //         status,
            //         message
            //     }))
            // }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Total Future Error",
            }))
        }
    }

    const handleDataTree = (data) => {
        const newDataCheckTree = data.map(item => (
            {
                ...item,
                children: item?.children.length > 0 ? item?.children.map(itemChild => (
                    {
                        ...itemChild,
                        value: `${item._id}-${itemChild._id}`,
                        volume24h: item?.volume24h
                    }
                )) : item?.children
            }
        ))
        return newDataCheckTree
    }

    const handleGetAllStrategies = async () => {
        resetAfterSuccess(true)
        try {
            window.scrollTo(0, 0)

            const res = await getAllStrategies()
            const { status, message, data: resData } = res.data

            const newDataCheckTree = handleDataTree(resData)

            dataCheckTreeDefaultRef.current = newDataCheckTree
            setDataCheckTree(newDataCheckTree)
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Strategies Error",
            }))
        }
    }


    const handleSyncSymbol = async () => {
        if (!loadingUploadSymbol) {
            try {
                setLoadingUploadSymbol(true)
                const res = await syncSymbol()
                const { status, message, data: resData } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                // status === 200 && handleGetAllStrategies()

                setLoadingUploadSymbol(false)
            }
            catch (err) {
                setLoadingUploadSymbol(false)
                dispatch(addMessageToast({
                    status: 500,
                    message: "Sync Error",
                }))
            }
        }
    }

    const handleFilterAll = (filterInput = {}) => {

        const filterListDefault = [
            // {
            //     name: "botType",
            //     value: botTypeSelected
            // },
            {
                name: "botID",
                value: botSelected
            },
            {
                name: "PositionSide",
                value: positionSideSelected
            },
            {
                name: "Candlestick",
                value: candlestickSelected
            }
        ]

        const filterList = filterListDefault.map(filterItem => {
            if (filterItem.name === filterInput.name) {
                return filterInput
            }
            return filterItem
        }).filter(item => item.value !== "All")
        const listData = filterList.length > 0 ? dataCheckTreeDefaultRef.current.map(data => {
            return {
                ...data,
                children: data?.children?.filter(item => filterList.every(filterItem => {
                    if (filterItem.name === "botID") {
                        return item[filterItem.name]._id === filterItem.value
                    }
                    return item[filterItem.name] === filterItem.value
                }))
            }
        }).filter(data => data?.children?.length > 0) : dataCheckTreeDefaultRef.current

        resetAfterSuccess()
        setDataCheckTree(listData)
    }


    const handleScrollData = () => {
        const dataTreeViewIndexTemp = dataTreeViewIndex + SCROLL_INDEX

        const scrollY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollPercentage = (scrollY / (scrollHeight - windowHeight)) * 100;

        if (dataTreeViewIndexTemp <= dataCheckTree.length) {
            const newIndex = dataTreeViewIndex + SCROLL_INDEX
            if (scrollPercentage >= 80) {
                setDataTreeViewIndex(newIndex)

            }

        }
        else {
            window.removeEventListener('scroll', handleScrollData)
            setDataTreeViewIndex(dataTreeViewIndex + SCROLL_INDEX)
        }
    }

    const resetAfterSuccess = (setFilterBox = false, filter = false) => {
        dataCheckTreeSelectedRef.current = []
        setDataTreeViewIndex(SCROLL_INDEX_FIRST)
        searchRef.current = ""
        handleCheckAllCheckBox(false)
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        !filter && (filterQuantityRef.current = [])
        if (setFilterBox) {
            setBotSelected('All')
            setBotTypeSelected("All")
            setPositionSideSelected(positionSideList[0].value)
            setCandlestickSelected(candlestickList[0].value)
        }
    }

    const dataCheckTreeCurrentLength = useMemo(() => {
        const list = dataCheckTreeRef.current.length > 0 ? dataCheckTreeRef.current : dataCheckTreeDefaultRef.current
        const result = list.reduce((pre, cur) => {
            return pre += cur.children.length
        }, 0)
        return result
    }, [dataCheckTreeDefaultRef.current, dataCheckTreeRef.current])


    useEffect(() => {
        if (userData.userName) {
            handleGetAllBotByUserID()
            handleGetAllStrategies()
            handleGetTotalFutureByBot()
        }

    }, [userData.userName]);

    useEffect(() => {
        if (dataCheckTree.length > 0) {


            if (selectAllRef.current) {
                document.querySelectorAll(".nodeParentSelected")?.forEach((item, index) => {
                    if (dataTreeViewIndex - SCROLL_INDEX - 1 <= index && index < dataTreeViewIndex) {
                        item.checked = false
                        item.click()
                    }
                })
                // document.querySelectorAll(".nodeItemSelected")?.forEach((item, index) => {
                //     if (dataTreeViewIndex - SCROLL_INDEX <= index && index < dataTreeViewIndex) {
                //         // console.log('gasn child');
                //         item.checked = true
                //     }
                // })
            }
            if (dataTreeViewIndex < dataCheckTree.length) {

                document.addEventListener('scroll', handleScrollData);
            }
            return () => document.removeEventListener('scroll', handleScrollData);

        }
    }, [dataCheckTree, dataTreeViewIndex]);

    useEffect(() => {
        dataCheckTreeRef.current = dataCheckTree
        resetAfterSuccess(filterQuantityRef.current.length ? true : false, true)
    }, [filterQuantityRef.current.length]);

    useEffect(() => {
        (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange) && handleGetAllStrategies()
    }, [openCreateStrategy, openEditTreeItemMultipleDialog]);

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["Strategies"]} />

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap-reverse",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--borderColor)",
                    paddingBottom: "24px",
                }}>

                <div className={styles.strategiesFilter}>
                    <TextField
                        value={searchRef.current}
                        size="small"
                        placeholder="Search"
                        onChange={(e) => {
                            resetAfterSuccess(true)
                            setDataCheckTree(() => {
                                const key = e.target.value
                                searchRef.current = key
                                let listFilter = filterQuantityRef.current.length ? dataCheckTreeRef.current : dataCheckTreeDefaultRef.current
                                if (key) {
                                    const newList = listFilter.filter(item => item.label.toUpperCase().includes(key.toUpperCase()?.trim()))
                                    return newList.length > 0 ? newList : []
                                }
                                return listFilter
                            })
                        }}
                        className={styles.strategiesFilterInput}
                    />
                    <FilterListIcon
                        style={{
                            fontSize: "2rem",
                            margin: "0 12px",
                            cursor: "pointer"
                        }}
                        onClick={() => {
                            setOpenFilterDialog(true)
                            searchRef.current = ""
                        }}
                    />
                    {filterQuantityRef.current.length ? <p>{filterQuantityRef.current.length} filters</p> : ""}
                </div>

                <div className={styles.strategiesHeader}>
                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Bot Type</FormLabel>
                        <Select
                            value={botTypeSelected}
                            size="small"
                        >
                            {
                                botTypeList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Bot</FormLabel>
                        <Select
                            value={botSelected}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                setBotSelected(value);
                                handleFilterAll({
                                    name: "botID",
                                    value
                                })
                            }}
                        >
                            {
                                botList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Position</FormLabel>
                        <Select
                            value={positionSideSelected}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                setPositionSideSelected(value);

                                handleFilterAll({
                                    name: "PositionSide",
                                    value
                                })
                            }}
                        >
                            {
                                positionSideList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Candle</FormLabel>
                        <Select
                            value={candlestickSelected}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                setCandlestickSelected(value);
                                handleFilterAll({
                                    name: "Candlestick",
                                    value
                                })
                            }}
                        >
                            {
                                candlestickList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                </div>


            </div>

            {
                dataCheckTree.length > 0
                    ?
                    <div className={styles.strategiesData}>
                        <p
                            style={{
                                display: "flex",
                                alignItems: "center",
                                lineHeight: "100%"
                            }}
                        >
                            <input
                                className={clsx(styles.checkboxStyle, "treeNodeCheckAll")}
                                type="checkbox"
                                onClick={e => {
                                    const check = e.target.checked

                                    e.currentTarget.parentElement.parentElement.querySelectorAll(".nodeParentSelected")?.forEach(item => {
                                        item.checked = check
                                    })
                                    e.currentTarget.parentElement.parentElement.querySelectorAll(".nodeItemSelected")?.forEach(child => {
                                        child.checked = check
                                    })

                                    selectAllRef.current = check
                                    if (check) {
                                        dataCheckTree.forEach(data => {
                                            data.children?.forEach(child => {
                                                dataCheckTreeSelectedRef.current.push(JSON.stringify({
                                                    ...child,
                                                    parentID: data._id
                                                }))
                                            })
                                        })
                                    }
                                    else {
                                        dataCheckTreeSelectedRef.current = []
                                    }
                                }}
                            />
                            <span style={{
                                fontWeight: "bold",
                                color: "black",
                                fontSize: "1.1rem"
                            }}>All</span> <span style={{
                                fontWeight: "600",
                                marginLeft: "6px"
                            }}>( {countTotalActive.countActive} / {countTotalActive.totalItem} )</span>
                        </p>
                        {dataCheckTree.slice(0, dataTreeViewIndex).map((treeData) => {
                            return (
                                <TreeParent
                                    dataCheckTreeSelectedRef={dataCheckTreeSelectedRef}
                                    treeData={treeData}
                                    setOpenCreateStrategy={setOpenCreateStrategy}
                                    setDataCheckTree={setDataCheckTree}
                                    dataCheckTreeCurrentLength={dataCheckTreeCurrentLength}
                                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                                    key={treeData._id}
                                />
                            )
                        })}
                    </div>

                    : (
                        <p style={{
                            textAlign: "center",
                            marginTop: "16px",
                            fontWeight: 500
                        }}>No data</p>
                    )
            }

            <div className={styles.strategiesBtnAction}>
                <Tooltip title="Sync Symbol" placement="left">
                    <div className={styles.strategiesBtnActionItem}
                        onClick={handleSyncSymbol}
                    >

                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }} >

                            {
                                !loadingUploadSymbol ? <CloudSyncIcon /> : <CircularProgress style={{ width: "50%", height: "50%" }} color='inherit' />
                            }

                        </Avatar>
                    </div>
                </Tooltip>
                <Tooltip title="Edit" placement="left">

                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            dataCheckTreeSelectedRef.current.length > 0 && setOpenEditTreeItemMultipleDialog({
                                dataChange: false,
                                isOpen: true
                            })
                        }}
                    >
                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }}>
                            <EditIcon />
                        </Avatar>
                    </div>
                </Tooltip>
                <Tooltip title="Add" placement="left">

                    <div
                        className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            setOpenCreateStrategy(openCreateStrategy => ({
                                ...openCreateStrategy,
                                isOpen: true,

                            }))
                        }}
                    >
                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }}>
                            <AddIcon
                            />
                        </Avatar>
                    </div>
                </Tooltip>

                {dataTreeViewIndex <= dataCheckTree.length && <KeyboardDoubleArrowDownIcon className={styles.scrollDownIcon} />}
            </div>


            {openFilterDialog &&

                <FilterDialog
                    filterQuantityRef={filterQuantityRef}
                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                    setDataCheckTree={setDataCheckTree}
                    onClose={() => {
                        setOpenFilterDialog(false)
                    }}
                />

            }

            {openCreateStrategy.isOpen &&

                <CreateStrategy
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenCreateStrategy(data)
                    }}
                    symbolValueInput={openCreateStrategy.symbolValueInput}
                />

            }


            {openEditTreeItemMultipleDialog.isOpen &&

                <EditMulTreeItem
                    // setDataCheckTree={setDataCheckTreeWithAll}
                    dataCheckTreeSelected={[...new Set(dataCheckTreeSelectedRef.current)]}
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenEditTreeItemMultipleDialog(data)
                    }}
                />

            }

        </div >
    );
}

export default Margin;