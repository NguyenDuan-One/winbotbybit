import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, FormLabel, FormControl, Tooltip, Switch, Checkbox, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import CreateStrategy from './components/CreateStrategy';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import AddBreadcrumbs from '../../../../components/BreadcrumbsCutom';
import { formatNumberString } from '../../../../functions';
import useDebounce from '../../../../hooks/useDebounce';
import { getAllBotActiveByUserID } from '../../../../services/botService';
import { getTotalFutureByBot } from '../../../../services/dataCoinByBitService';
import { addMessageToast } from '../../../../store/slices/Toast';
import { setTotalFuture } from '../../../../store/slices/TotalFuture';
import { getAllConfigScanner } from '../../../../services/scannerService';
import DataGridCustom from '../../../../components/DataGridCustom';
import DialogCustom from '../../../../components/DialogCustom';


function Scanner() {

    const userData = useSelector(state => state.userDataSlice.userData)


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

    const marketList = [
        {
            name: "All",
            value: "All"
        },
        {
            name: "Margin",
            value: "Margin",
        },
        {
            name: "Spot",
            value: "Spot",
        },
    ]

    const tableColumns = [
        {
            field: 'stt',
            renderHeader: header => {
                return <Checkbox
                    style={{
                        padding: " 0 ",
                    }}
                    sx={{
                        color: "#b5b5b5",
                        '&.Mui-checked': {
                            color: "var(--yellowColor)",
                        },
                    }}
                    icon={<StarBorderIcon />}
                    checkedIcon={<StarIcon />}
                    onClick={e => {

                    }}
                />
            },
            type: "actions",
            maxWidth: 30,
            renderCell: (params) => {
                const bookmarkList = params.row['bookmarkList']

                return <Checkbox
                    checked={bookmarkList.includes(userData._id)}
                    style={{
                        padding: " 0 6px",
                    }}
                    sx={{
                        color: "#b5b5b5",
                        '&.Mui-checked': {
                            color: "var(--yellowColor)",
                        },
                    }}
                    icon={<StarBorderIcon />}
                    checkedIcon={<StarIcon />}
                    onClick={e => {

                    }}
                />
            }
        },
        {
            field: 'IsActive',
            type: "actions",
            maxWidth: 120,
            headerName: 'Active',
            renderCell: params => {
                return (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#3277d5",
                        marginLeft: "-10px "
                    }}>
                        <Switch
                            size='small'
                            checked={params.row['IsActive']}
                        />
                        <DeleteOutlineIcon className={styles.icon} style={{ margin: "0 3px 0 2px", }} />
                        <EditIcon className={styles.icon} />
                    </div>
                )

            },

        },
        {
            field: 'BotName',
            headerName: 'Bot',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Label',
            headerName: 'Label',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Market',
            headerName: 'Market',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'PositionSide',
            headerName: 'Position',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const rowData = params.row
                const PositionSide = rowData['PositionSide']
                return <p style={{
                    color: PositionSide === "Long" ? "green" : "red"
                }}>{PositionSide}</p>
            }
        },
        {
            field: 'OrderChange',
            headerName: 'OC (%)',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Elastic',
            headerName: 'Elastic (%)',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Turnover',
            headerName: 'Turnover ($)',
            minWidth: 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Turnover'])}</p>
            }
        },
        {
            field: 'Numbs',
            headerName: 'Numbs',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Amount',
            headerName: 'Amount ($)',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Amount'])}</p>
            }
        },
        {
            field: 'Limit',
            headerName: 'Limit ($)',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Limit'])}</p>
            }
        },
        {
            field: 'Expire',
            headerName: 'Expire (min)',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OnlyPairs',
            headerName: 'Only Pairs',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const list = params.row["OnlyPairs"]
                return <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowOnlyPairsList(list)
                        }}
                    />
                    }
                </div>
            }
        },
        {
            field: 'Blacklist',
            headerName: 'Blacklist',
            minWidth: 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const list = params.row["Blacklist"]
                return <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowBlackList(list)
                        }}
                    />}
                </div>
            }
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
    const [showOnlyPairsList, setShowOnlyPairsList] = useState(false)
    const [showBlackList, setShowBlackList] = useState(false)

    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);
    const [loadingDataCheckTree, setLoadingDataCheckTree] = useState(false);
    const [dataCheckTreeSelected, setDataCheckTreeSelected] = useState([]);

    const dataCheckTreeDefaultObject = useRef({})
    const dataCheckTreeDefaultRef = useRef([])
    const [dataCheckTree, setDataCheckTree] = useState([]);

    const [searchKey, setSearchKey] = useState("");
    // Filter

    const filterQuantityRef = useRef([])
    const botTypeSelectedRef = useRef("All")
    const botSelectedRef = useRef("All")
    const positionSideSelectedRef = useRef("All")
    const marketSelectedRef = useRef("All")
    const bookmarkCheckRef = useRef(false)

    const dispatch = useDispatch()


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


    const handleGetAllStrategies = async (botListInput = botList.slice(1), filterStatus = false) => {

        setLoadingDataCheckTree(true)
        filterQuantityRef.current = []
        !filterStatus && resetAfterSuccess()

        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false

        try {
            window.scrollTo(0, 0)

            const res = await getAllConfigScanner(botListInput?.map(item => item?.value))
            const { data: resData } = res.data

            const newData = resData.map(item => {
                const id = item?._id
                dataCheckTreeDefaultObject.current[id] = item
                return ({
                    id,
                    ...item,
                    BotName:item.botID.botName
                })
            })

            dataCheckTreeDefaultRef.current = newData
            !filterStatus ? setDataCheckTree(newData) : handleFilterAll()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
        setLoadingDataCheckTree(false)
    }


    // const handleSyncSymbol = async () => {
    //     if (!loadingUploadSymbol) {
    //         try {
    //             setLoadingUploadSymbol(true)
    //             const res = await syncSymbolScanner()
    //             const { status, message, data: resData } = res.data

    //             dispatch(addMessageToast({
    //                 status: status,
    //                 message: message,
    //             }))

    //             handleGetAllStrategies()
    //             setLoadingUploadSymbol(false)
    //         }
    //         catch (err) {
    //             setLoadingUploadSymbol(false)
    //             dispatch(addMessageToast({
    //                 status: 500,
    //                 message: "Sync Error",
    //             }))
    //         }
    //     }
    // }

    const handleFilterAll = () => {
        filterQuantityRef.current = []

        const listData = dataCheckTreeDefaultRef.current.filter(item => {
            const checkBotType = botTypeSelectedRef.current === "All" || botTypeSelectedRef.current === item.botID.botType;
            const checkBot = botSelectedRef.current === "All" || botSelectedRef.current === item.botID._id;
            const checkPosition = positionSideSelectedRef.current === "All" || positionSideSelectedRef.current === item.PositionSide;
            const checkMarket = marketSelectedRef.current === "All" || marketSelectedRef.current === item.Market;
            const checkSearch = searchDebounce === "" || item.Label.toUpperCase().includes(searchDebounce.toUpperCase().trim());
            const checkBookmark = bookmarkCheckRef.current ? item.bookmarkList?.includes(userData._id) : true

            return checkBotType && checkBot && checkPosition && checkMarket && checkSearch && checkBookmark;
        });


        setDataCheckTree(listData)

    }


    const resetAfterSuccess = () => {
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        marketSelectedRef.current = "All"
        setSearchKey("")
    }

    const searchDebounce = useDebounce(searchKey)

    const handleDataCheckTreeSelected = useMemo(() => {
        return dataCheckTreeSelected.map(id => {
            return JSON.stringify(dataCheckTreeDefaultObject.current[id])
        })
    }, [dataCheckTreeSelected,dataCheckTree,dataCheckTreeDefaultRef.current])

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
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange) {
            handleGetAllStrategies(undefined, true)
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange]);

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
                        value={searchKey}
                        size="small"
                        placeholder="Search"
                        onChange={(e) => {
                            setSearchKey(e.target.value)
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
                        <FormLabel className={styles.formLabel}>Market</FormLabel>
                        <Select
                            value={marketSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                marketSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                marketList.map(item => (
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
            <div className={styles.strategiesData}>
                {
                    (dataCheckTree.length > 0 && !loadingDataCheckTree)
                        ?
                        <DataGridCustom
                            setDataTableChange={setDataCheckTreeSelected}
                            tableRows={dataCheckTree}
                            tableColumns={tableColumns}
                            hideFooter
                            centerCell
                        />
                        :
                        <p style={{
                            textAlign: "center",
                            margin: "16px 0 6px",
                            fontWeight: 500,
                            opacity: ".6"
                        }}>{loadingDataCheckTree ? "Loading..." : "No data"}</p>
                }
            </div>

            <div className={styles.strategiesBtnAction}>
                {/* <Tooltip title="Sync Symbol" placement="left">
                    <div className={styles.strategiesBtnActionItem}
                        onClick={handleSyncSymbol}
                    >

                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }} >

                            {
                                !loadingUploadSymbol ? <CloudSyncIcon /> : <CircularProgress style={{ width: "50%", height: "50%" }} color='inherit' />
                            }

                        </Avatar>
                    </div>
                </Tooltip> */}
                <Tooltip title="Edit" placement="left">

                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            dataCheckTreeSelected.length > 0 && setOpenEditTreeItemMultipleDialog({
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
                    dataCheckTreeSelected={handleDataCheckTreeSelected}
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenEditTreeItemMultipleDialog(data)
                    }}
                />

            }

            {showOnlyPairsList && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowOnlyPairsList(false)
                    }}
                    dialogTitle='Only Pairs'
                    hideActionBtn
                    backdrop
                >
                    <Table className={styles.addMember}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Symbol </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                showOnlyPairsList.map((data, index) => (
                                    <TableRow key={data}>
                                        <TableCell>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            {data}
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </DialogCustom>
            )
            }
            {
                showBlackList && (
                    <DialogCustom
                        open={true}
                        onClose={() => {
                            setShowBlackList(false)
                        }}
                        dialogTitle='BlackList'
                        hideActionBtn
                        backdrop
                    >

                        <Table className={styles.addMember}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                    <TableCell style={{ fontWeight: "bold" }}>Symbol </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {
                                    showBlackList.map((data, index) => (
                                        <TableRow key={data}>
                                            <TableCell>
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                {data}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>

                    </DialogCustom>
                )
            }

        </div >
    );
}

export default Scanner;