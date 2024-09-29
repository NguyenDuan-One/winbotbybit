
import { MenuItem, Select, TextField, Avatar, Checkbox, CircularProgress, FormLabel, FormControl, Tooltip, Button } from '@mui/material';
import AddBreadcrumbs from '../../components/BreadcrumbsCutom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { getAllStrategies, getTotalFutureByBot, syncSymbol } from '../../services/dataCoinByBitService';
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import CreateStrategy from './components/CreateStrategy';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import TreeParent from './components/TreeView/TreeParent';
import { handleCheckAllCheckBox } from '../../functions';
import clsx from 'clsx';
import { getAllBotActiveByUserID } from '../../services/botService';
import { setTotalFuture } from '../../store/slices/TotalFuture';
import useDebounce from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { setStrategiesTempData } from '../../store/slices/StrategiesTemp';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import RestoreIcon from '@mui/icons-material/Restore';
function Strategies() {

    const userData = useSelector(state => state.userDataSlice.userData)


    const SCROLL_INDEX = 5
    const SCROLL_INDEX_FIRST = window.innerHeight / 30

    // const botTypeList = [
    //     {
    //         name: "All",
    //         value: "All"
    //     },
    //     {
    //         name: "BybitV3",
    //         value: "BybitV3"
    //     }
    // ]

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

    const navigate = useNavigate()

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
    const [loadingDataCheckTree, setLoadingDataCheckTree] = useState(false);

    const dataCheckTreeSelectedRef = useRef([])
    const dataCheckTreeSelectedSymbolRef = useRef({})
    const dataCheckTreeDefaultRef = useRef([])
    const [dataCheckTree, setDataCheckTree] = useState([]);
    const [loadingUploadSymbol, setLoadingUploadSymbol] = useState(false);
    const [dataTreeViewIndex, setDataTreeViewIndex] = useState(SCROLL_INDEX_FIRST);

    const [searchKey, setSearchKey] = useState("");
    // Filter

    const filterQuantityRef = useRef([])
    const botTypeSelectedRef = useRef("All")
    const botSelectedRef = useRef("All")
    const positionSideSelectedRef = useRef("All")
    const candlestickSelectedRef = useRef("All")
    const selectAllRef = useRef(false)
    const bookmarkCheckRef = useRef(false)

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

        getAllBotActiveByUserID(userData._id, "ByBitV3")
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
                handleGetAllStrategies(newData)

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
                bookmarkList: item?.bookmarkList || [],
                children: item?.children.length > 0 ? item?.children.map(itemChild => (
                    {
                        ...itemChild,
                        value: `${item._id}-${itemChild._id}`,
                        volume24h: item?.volume24h,

                    }
                )) : item?.children
            }
        ))
        return newDataCheckTree
    }

    const handleGetAllStrategies = async (botListInput = botList.slice(1), filterStatus = false) => {

        setLoadingDataCheckTree(true)
        filterQuantityRef.current = []
        !filterStatus && resetAfterSuccess()

        dataCheckTreeSelectedRef.current = []
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        setDataTreeViewIndex(SCROLL_INDEX_FIRST)
        handleCheckAllCheckBox(false)

        try {
            window.scrollTo(0, 0)

            const res = await getAllStrategies(botListInput?.map(item => item?.value))
            const { status, message, data: resData } = res.data

            const newDataCheckTree = handleDataTree(resData)

            dataCheckTreeDefaultRef.current = newDataCheckTree

            !filterStatus ? setDataCheckTree(newDataCheckTree) : handleFilterAll()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Strategies Error",
            }))
        }
        setLoadingDataCheckTree(false)
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

                handleGetAllStrategies()
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
        const listData = dataCheckTreeDefaultRef.current.reduce((acc, data) => {

            const filteredChildren = data?.children?.filter(item => {
                const checkBotType = botTypeSelectedRef.current === "All" || botTypeSelectedRef.current === item.botID.botType;
                const checkBot = botSelectedRef.current === "All" || botSelectedRef.current === item.botID._id;
                const checkPosition = positionSideSelectedRef.current === "All" || positionSideSelectedRef.current === item.PositionSide;
                const checkCandle = candlestickSelectedRef.current === "All" || candlestickSelectedRef.current === item.Candlestick;
                const checkSearch = searchDebounce === "" || data.label.toUpperCase().includes(searchDebounce.toUpperCase().trim());
                const checkBookmark = bookmarkCheckRef.current ? data.bookmarkList?.includes(userData._id) : true

                return checkBotType && checkBot && checkPosition && checkCandle && checkSearch && checkBookmark;
            });

            if (filteredChildren.length > 0) {
                acc.push({ ...data, children: filteredChildren });
            }

            return acc;
        }, []);
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
            if (scrollPercentage >= 70) {
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
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        setDataTreeViewIndex(SCROLL_INDEX_FIRST)
        handleCheckAllCheckBox(false)
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        candlestickSelectedRef.current = "All"
        bookmarkCheckRef.current = false
        setSearchKey("")
    }


    const searchDebounce = useDebounce(searchKey)

    useEffect(() => {
        handleFilterAll()
    }, [searchDebounce]);

    useEffect(() => {
        if (userData.userName) {
            handleGetAllBotByUserID()
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
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange) {
            handleGetAllStrategies(undefined, true)
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange]);

    const [showMoreSearch, setShowMoreSearch] = useState(true)

    function changeMoreSearch() {
        setShowMoreSearch(!showMoreSearch)
    }

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["Strategies"]} />

            <div className='W-100 grid lg:grid-cols-2 md:grid-cols-1 gap-2 items-center'>
                <div className="flex gap-2">
                    <TextField
                        value={searchKey}
                        size="small"
                        placeholder="Search"
                        onChange={(e) => {
                            setSearchKey(e.target.value)
                        }}
                        className={styles.strategiesFilterInput}
                    />
                    <button className='btn bg-blue-500 rounded-lg' onClick={() => {
                        setOpenFilterDialog(true)
                    }}>
                        <ManageSearchIcon
                            style={{
                                fontSize: "2rem",
                                margin: "0 12px",
                                cursor: "pointer",
                                color: "#fff"
                            }} />
                    </button>

                    <button className='btn bg-blue-500 rounded-lg'  onClick={changeMoreSearch}>
                        <MoreVertIcon
                            style={{
                                fontSize: "2rem",
                                margin: "0 12px",
                                cursor: "pointer",
                                color: "#fff"
                            }}
                           
                        />
                    </button>

                    {filterQuantityRef.current.length ? <p>{filterQuantityRef.current.length} filters</p> : ""}
                </div>

                {
                    showMoreSearch && <div className='grid grid-cols-3 gap-2'>
                        {/* <FormControl className={styles.strategiesHeaderItem}>
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
                </FormControl> */}

                        <FormControl className={styles.strategiesHeaderItem}>
                            <FormLabel className={styles.formLabel}>VPS</FormLabel>
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
                            <FormLabel className={styles.formLabel}>Vị thế</FormLabel>
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

                        <FormControl className={styles.strategiesHeaderItem}>
                            <FormLabel className={styles.formLabel}>Khung thời gian</FormLabel>
                            <Select
                                value={candlestickSelectedRef.current}
                                size="small"
                                onChange={e => {
                                    const value = e.target.value;
                                    candlestickSelectedRef.current = value
                                    handleFilterAll()
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
                }
                <div className='flex gap-5'>
                    <Button className='w-[60px] text-center !bg-blue-500 !rounded-xl' variant="contained" onClick={() => {
                        setOpenCreateStrategy(openCreateStrategy => ({
                            ...openCreateStrategy,
                            isOpen: true,
                            symbolValueInput: Object.values(dataCheckTreeSelectedSymbolRef.current)
                        }))
                    }}><ControlPointIcon/></Button>
                    <Button className='w-[60px] text-center !bg-blue-500 !rounded-xl' variant="contained" onClick={() => {
                        dataCheckTreeSelectedRef.current.length > 0 && setOpenEditTreeItemMultipleDialog({
                            dataChange: false,
                            isOpen: true
                        })
                    }}><EditNoteIcon/></Button>
                    <Button className='w-[60px] text-center !bg-blue-500 !rounded-xl' variant="contained" onClick={handleSyncSymbol}><SaveAsIcon/></Button>
                    <Button className='!rounded-xl !bg-blue-500' variant="contained" color="info" onClick={() => {
                        navigate("/StrategiesTemp")
                        dispatch(setStrategiesTempData(dataCheckTreeDefaultRef.current))
                    }}><RestoreIcon></RestoreIcon></Button>
                </div>
                {
                    !loadingUploadSymbol ? <></> : <span>Đang trong quá trình đồng bộ...</span>
                }
            </div>
            <div className={styles.strategiesData}>

                {!loadingDataCheckTree && <p
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
                                    dataCheckTreeSelectedSymbolRef.current[data.value] = {
                                        name: data.value,
                                        value: data.value
                                    }

                                })
                            }
                            else {
                                dataCheckTreeSelectedRef.current = []
                                dataCheckTreeSelectedSymbolRef.current = []
                            }
                        }}
                    />
                    <span style={{
                        fontWeight: "bold",
                        color: "black",
                        fontSize: "1.1rem"
                    }}>Tất cả</span> <span style={{
                        fontWeight: "600",
                        marginLeft: "6px"
                    }}>( {countTotalActive.countActive} / {countTotalActive.totalItem} )</span>

                    <span style={{ margin: "0px 2px 3px 12px", opacity: ".6", fontSize: ".9rem" }}>|</span>
                    <div className={styles.bookmarkAll}   >
                        <Checkbox
                            checked={bookmarkCheckRef.current}
                            style={{
                                padding: " 0 6px",
                            }}
                            sx={{
                                color: "#0666",
                                '&.Mui-checked': {
                                    color: "#1975CF",
                                },
                            }}
                            onClick={e => {
                                const value = e.target.checked;
                                bookmarkCheckRef.current = value
                                handleFilterAll()
                            }}
                            icon={<BookmarkBorderIcon />}
                            checkedIcon={<BookmarkIcon />}
                        />
                        <span for="">Danh sách yêu thích</span>
                    </div>
                </p>}
                {
                    (dataCheckTree.length > 0 && !loadingDataCheckTree)
                        ?

                        dataCheckTree.slice(0, dataTreeViewIndex).map((treeData) => {
                            return (
                                <TreeParent
                                    dataCheckTreeSelectedSymbolRef={dataCheckTreeSelectedSymbolRef}
                                    dataCheckTreeSelectedRef={dataCheckTreeSelectedRef}
                                    treeData={treeData}
                                    setOpenCreateStrategy={setOpenCreateStrategy}
                                    setDataCheckTree={setDataCheckTree}
                                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                                    key={treeData._id}
                                />
                            )
                        })

                        :
                        <p style={{
                            textAlign: "center",
                            margin: "16px 0 6px",
                            fontWeight: 500,
                            opacity: ".6"
                        }}>{loadingDataCheckTree ? "Loading..." : "No data"}</p>
                }
            </div>

            {/* <div className={styles.strategiesBtnAction}>
                <Tooltip title="Restore Config" placement="left">
                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            navigate("/StrategiesTemp")
                            dispatch(setStrategiesTempData(dataCheckTreeDefaultRef.current))
                        }}
                    >

                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }} >
                            <RestoreIcon />
                        </Avatar>
                    </div>
                </Tooltip>
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
                                symbolValueInput: Object.values(dataCheckTreeSelectedSymbolRef.current)
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
            </div> */}


            {openFilterDialog &&

                <FilterDialog
                    filterQuantityRef={filterQuantityRef}
                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                    setDataCheckTree={setDataCheckTree}
                    resetAfterSuccess={resetAfterSuccess}
                    onClose={() => {
                        setOpenFilterDialog(false)
                    }}
                    botListInput={botList.slice(1)}
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

export default Strategies;