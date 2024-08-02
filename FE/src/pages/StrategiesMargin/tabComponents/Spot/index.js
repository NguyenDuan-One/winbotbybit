
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, CircularProgress, FormLabel, FormControl, Tooltip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import TreeParent from './components/TreeView/TreeParent';
import clsx from 'clsx';
import AddBreadcrumbs from '../../../../components/BreadcrumbsCutom';
import { handleCheckAllCheckBox } from '../../../../functions';
import { getAllBotActiveByUserID } from '../../../../services/botService';
import { getTotalFutureByBot } from '../../../../services/dataCoinByBitService';
import { addMessageToast } from '../../../../store/slices/Toast';
import { setTotalFuture } from '../../../../store/slices/TotalFuture';
import CreateStrategy from './components/CreateStrategy';
import { getAllStrategiesSpot, syncSymbolSpot } from '../../../../services/spotService';

function Spot() {

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
    const [dataCheckTree, setDataCheckTree] = useState([]);
    const [loadingUploadSymbol, setLoadingUploadSymbol] = useState(false);
    const [dataTreeViewIndex, setDataTreeViewIndex] = useState(SCROLL_INDEX_FIRST);

    const filterQuantityRef = useRef([])
    const searchRef = useRef("")
    const botTypeSelectedRef = useRef("All")
    const botSelectedRef = useRef("All")
    const positionSideSelectedRef = useRef("All")
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
        resetAfterSuccess()
        try {
            window.scrollTo(0, 0)

            const res = await getAllStrategiesSpot()
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
                const res = await syncSymbolSpot()
                const { status, message, data: resData } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))

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

    const handleFilterAll = () => {
        filterQuantityRef.current = []
        const listData = dataCheckTreeDefaultRef.current.map(data => {
            return {
                ...data,
                children: data?.children?.filter(item => {
                    const checkBotType = botTypeSelectedRef.current !== "All" ? botTypeSelectedRef.current === item.botID.botType : true
                    const checkBot = botSelectedRef.current !== "All" ? botSelectedRef.current === item.botID._id : true
                    const checkPosition = positionSideSelectedRef.current !== "All" ? positionSideSelectedRef.current === item.PositionSide : true
                    const checkSearch = searchRef.current !== "" ? data.label.toUpperCase().includes(searchRef.current.toUpperCase()?.trim()) : true
                    return checkBotType && checkBot && checkPosition  && checkSearch
                })
            }
        }).filter(data => data?.children?.length > 0)

        setDataCheckTree(listData)
        handleCheckAllCheckBox(false)

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

    const resetAfterSuccess = () => {
        dataCheckTreeSelectedRef.current = []
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        searchRef.current = ""
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        handleCheckAllCheckBox(false)
        setDataTreeViewIndex(SCROLL_INDEX_FIRST)
    }

    // const dataCheckTreeCurrentLength = useMemo(() => {
    //     const list = dataCheckTreeRef.current.length > 0 ? dataCheckTreeRef.current : dataCheckTreeDefaultRef.current
    //     const result = list.reduce((pre, cur) => {
    //         return pre += cur.children.length
    //     }, 0)
    //     return result
    // }, [dataCheckTreeDefaultRef.current, dataCheckTreeRef.current])

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
                            const key = e.target.value
                            searchRef.current = key
                            handleFilterAll()
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
                        }}
                    />
                    {filterQuantityRef.current.length ? <p>{filterQuantityRef.current.length} filters</p> : ""}
                </div>

                <div className={styles.strategiesHeader}>
                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Bot Type</FormLabel>
                        <Select
                            value={botTypeSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                botTypeSelectedRef.current = value
                                handleFilterAll()
                            }}
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
                            value={botSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                botSelectedRef.current = value
                                handleFilterAll()
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
                            value={positionSideSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                positionSideSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                positionSideList.map(item => (
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
                    resetAfterSuccess={resetAfterSuccess}
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

export default Spot;