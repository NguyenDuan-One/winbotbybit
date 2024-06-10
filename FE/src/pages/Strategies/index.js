
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import ReactDOM from 'react-dom';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, Checkbox, CircularProgress } from '@mui/material';
import AddBreadcrumbs from '../../components/BreadcrumbsCutom';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { getAllStrategies, syncSymbol } from '../../services/dataCoinByBitService';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import CreateStrategy from './components/CreateStrategy';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import TreeParent from './components/TreeView/TreeParent';
import { handleCheckAllCheckBox } from '../../functions';
import clsx from 'clsx';
import { getAllBotByUserID } from '../../services/botService';

function Strategies() {

    const SCROLL_INDEX = 15

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
    const [dataTreeViewIndex, setDataTreeViewIndex] = useState(SCROLL_INDEX);
    const filterQuantityRef = useRef([])
    const searchRef = useRef("")

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
        const userData = JSON.parse(localStorage.getItem("user"))
        getAllBotByUserID(userData._id)
            .then(res => {
                const data = res.data.data;
                const newData = data?.map(item => (
                    {
                        name: item?.botName,
                        value: item?._id,
                    }
                ))
                setBotList([
                    {
                        name: "All",
                        value: "All"
                    },
                    ...newData
                ])
            })
            .catch(error => {
            }
            )
    }

    const handleDataTree = (data) => {
        const newDataCheckTree = data.map(item => (
            {
                ...item,
                children: item?.children.length > 0 ? item?.children.map(itemChild => ({ ...itemChild, value: `${item._id}-${itemChild._id}` })) : item?.children
            }
        ))
        return newDataCheckTree
    }

    const handleGetAllStrategies = async () => {
        dataCheckTreeSelectedRef.current = []
        setDataTreeViewIndex(SCROLL_INDEX)

        handleCheckAllCheckBox(false)
        try {
            const res = await getAllStrategies()
            const { status, message, data: resData } = res.data

            // const newDataCheckTree = handleDataTree([
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            //     ...resData,
            // ])

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
                status === 200 && handleGetAllStrategies()

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

    const handleFilterWithBot = e => {
        setDataTreeViewIndex(SCROLL_INDEX)
        searchRef.current = ""
        handleCheckAllCheckBox(false)

        const botID = e.target.value

        const listData = botID !== "All" ? dataCheckTreeDefaultRef.current.map(data => {
            return {
                ...data,
                children: data?.children?.filter(item => item.botID?._id === botID)
            }
        }).filter(data => data?.children?.length > 0) : dataCheckTreeDefaultRef.current

        setDataCheckTree(listData)
    }


    const handleScrollData = () => {
        const dataTreeViewIndexTemp = dataTreeViewIndex + SCROLL_INDEX

        const scrollY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollPercentage = (scrollY / (scrollHeight - windowHeight)) * 100;
        console.log(scrollPercentage);

        if (dataTreeViewIndexTemp <= dataCheckTree.length) {
            scrollPercentage >= 80 && setDataTreeViewIndex(dataTreeViewIndex + SCROLL_INDEX)
        }
        else {
            window.removeEventListener('scroll', handleScrollData)
            setDataTreeViewIndex(dataTreeViewIndex + SCROLL_INDEX)
        }
    }

    useEffect(() => {

        handleGetAllBotByUserID()

        handleGetAllStrategies()


    }, []);

    useEffect(() => {
        if (dataCheckTree.length > 0 && dataTreeViewIndex < dataCheckTree.length) {
            document.addEventListener('scroll', handleScrollData);
            return () => document.removeEventListener('scroll', handleScrollData);
        }
    }, [dataCheckTree, dataTreeViewIndex]);

    useEffect(() => {
        dataCheckTreeRef.current = dataCheckTree
    }, [filterQuantityRef.current]);

    useEffect(() => {
        (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange) && !filterQuantityRef.current.length && handleGetAllStrategies()
    }, [openCreateStrategy, openEditTreeItemMultipleDialog]);

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["Strategies"]} />

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap-reverse",
                    borderBottom: "1px solid var(--borderColor)",
                    paddingBottom: "24px",
                    paddingTop: "12px",
                }}>

                <div className={styles.strategiesFilter}>
                    <TextField
                        value={searchRef.current}
                        size="small"
                        placeholder="Search"
                        onChange={(e) => {
                            setDataTreeViewIndex(SCROLL_INDEX)
                            setDataCheckTree(() => {
                                const key = e.target.value
                                searchRef.current = key
                                let listFilter = filterQuantityRef.current.length ? dataCheckTreeRef.current : dataCheckTreeDefaultRef.current
                                if (key) {
                                    const newList = listFilter.filter(item => item.label.toUpperCase().startsWith(key.toUpperCase().trim()))
                                    return newList.length > 0 ? newList : []
                                }
                                return listFilter
                            })
                            handleCheckAllCheckBox(false)
                        }}
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
                    <Select
                        className={styles.strategiesHeaderItem}
                        defaultValue={botTypeList[0].value}
                        size="small"
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                    <Select
                        className={styles.strategiesHeaderItem}
                        defaultValue={botList[0]?.value}
                        size="small"
                        onChange={handleFilterWithBot}
                    >
                        {
                            botList.map(item => (
                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
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
                <div className={styles.strategiesBtnActionItem}
                    onClick={handleSyncSymbol}
                >
                    <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }}>

                        {
                            !loadingUploadSymbol ? <CloudSyncIcon /> : <CircularProgress style={{ width: "50%", height: "50%" }} color='inherit' />
                        }

                    </Avatar>
                </div>
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
                    dataCheckTreeSelected={dataCheckTreeSelectedRef.current}
                    botList={botList.slice(1)}
                    onClose={(data) => {
                        setOpenEditTreeItemMultipleDialog(data)
                    }}
                />

            }

        </div >
    );
}

export default Strategies;